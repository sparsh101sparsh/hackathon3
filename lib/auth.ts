import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'codeforge-jwt-secret-key-2026');
const PASSWORD_SCHEME = 'pbkdf2-sha512';
const PASSWORD_ITERATIONS = 210_000;

/**
 * Hashes password using Node.js native crypto (pbkdf2)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, 'sha512').toString('hex');
  return `${PASSWORD_SCHEME}$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verifies password against stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const modernParts = storedHash.split('$');
    const isModern = modernParts.length === 4 && modernParts[0] === PASSWORD_SCHEME;
    const iterations = isModern ? Number(modernParts[1]) : 1000;
    const salt = isModern ? modernParts[2] : storedHash.split(':')[0];
    const originalHash = isModern ? modernParts[3] : storedHash.split(':')[1];
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    const expected = Buffer.from(originalHash, 'hex');
    const actual = Buffer.from(hash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Hashes a short-lived verification code before it is persisted. The server
 * secret prevents the six-digit value from being recovered from the database.
 */
export function hashVerificationCode(code: string): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is required in production');
  return crypto.createHmac('sha256', JWT_SECRET).update(code).digest('hex');
}

export function verifyVerificationCode(code: string, storedHash: string): boolean {
  try {
    const expected = Buffer.from(hashVerificationCode(code), 'hex');
    const actual = Buffer.from(storedHash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Signs a JWT-style session token with HMAC-SHA256
 */
export function signToken(user: { id: string; email: string; name: string; role: string }): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is required in production');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: UserSessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');

  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * Verifies and parses a session token
 */
export function verifyToken(token: string): UserSessionPayload | null {
  try {
    if (!JWT_SECRET || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadEncoded, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payloadEncoded}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: UserSessionPayload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export function getRequestToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = req.cookies.get('codeforge_session')?.value;
  return headerToken || cookieToken || null;
}

export function getSessionFromRequest(req: NextRequest): UserSessionPayload | null {
  const token = getRequestToken(req);
  return token ? verifyToken(token) : null;
}

export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const session = getSessionFromRequest(req);
  if (!session?.userId || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  }
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  }
  return null;
}

export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('codeforge_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  return response;
}
