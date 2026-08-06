import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword, hashVerificationCode } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const VALID_PURPOSES = ['SIGNUP', 'LOGIN', 'RESET_PASSWORD'] as const;
type Purpose = typeof VALID_PURPOSES[number];

export async function POST(req: NextRequest) {
  try {
    const requestLimit = checkRateLimit(req, 'auth:send-code', 20, 15 * 60 * 1000);
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification requests. Please try again later.', retryAfter: requestLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(requestLimit.retryAfter) } },
      );
    }
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A valid verification request is required' }, { status: 400 });
    }
    const { email, purpose = 'SIGNUP', name, password } = body;

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json({ error: 'Name must be a text value' }, { status: 400 });
    }
    if (password !== undefined && typeof password !== 'string') {
      return NextResponse.json({ error: 'Password must be a text value' }, { status: 400 });
    }

    // Strictly validate purpose
    if (!VALID_PURPOSES.includes(purpose as Purpose)) {
      return NextResponse.json({ error: 'Invalid purpose specified' }, { status: 400 });
    }

    const cleanPurpose = purpose as Purpose;
    const cleanName = typeof name === 'string' ? name.trim() : '';

    // Keep expired one-time codes from accumulating when users abandon a flow.
    // The expiry index makes this bounded cleanup inexpensive in production.
    await prisma.emailVerification.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    // Prevent repeated sends for the same email and purpose. This is deliberately
    // database-backed so it still works when requests land on different instances.
    const recentVerification = await prisma.emailVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose: cleanPurpose,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (recentVerification) {
      const retryAfter = Math.max(1, Math.ceil((recentVerification.createdAt.getTime() + 60_000 - Date.now()) / 1000));
      return NextResponse.json(
        { error: `Please wait ${retryAfter} seconds before requesting another code.`, retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    if (cleanPurpose === 'SIGNUP') {
      if (cleanName && (cleanName.length < 2 || cleanName.length > 80)) {
        return NextResponse.json({ error: 'Name must be between 2 and 80 characters' }, { status: 400 });
      }

      if (password && (password.length < 8 || password.length > 128)) {
        return NextResponse.json({ error: 'Password must be between 8 and 128 characters long' }, { status: 400 });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please sign in instead.' },
          { status: 409 }
        );
      }
    } else if (cleanPurpose === 'LOGIN' || cleanPurpose === 'RESET_PASSWORD') {
      // Check if user exists for login or password reset
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: 'No account found with this email address. Please sign up first.' },
          { status: 404 }
        );
      }
    }

    // Generate 6-digit verification OTP code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    const passwordHash = password ? hashPassword(password) : undefined;

    // Delete any pending codes for this email and purpose to prevent clutter
    await prisma.emailVerification.deleteMany({
      where: {
        email: cleanEmail,
        purpose: cleanPurpose,
      },
    });

    // Create new verification entry
    await prisma.emailVerification.create({
      data: {
        email: cleanEmail,
        // Store only an HMAC digest. The plaintext code exists only for email delivery.
        code: hashVerificationCode(code),
        purpose: cleanPurpose,
        name: cleanName || undefined,
        passwordHash: passwordHash || undefined,
        expiresAt,
      },
    });

    // Send email (or log to dev console)
    const emailResult = await sendVerificationEmail({
      email: cleanEmail,
      code,
      purpose: cleanPurpose,
      name: cleanName || undefined,
    });

    if (!emailResult.success) {
      await prisma.emailVerification.deleteMany({
        where: { email: cleanEmail, purpose: cleanPurpose },
      });
      return NextResponse.json(
        { error: emailResult.error || 'Unable to send verification email right now.' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      expiresInSeconds: 600,
      // In development or when email is unavailable, expose the code so users can still test
      ...(process.env.NODE_ENV !== 'production' && emailResult.devCode
        ? { devCode: emailResult.devCode }
        : {}),
    });
  } catch (error: unknown) {
    console.error('Error in /api/auth/send-code:', error);
    return NextResponse.json(
      { error: 'Unable to send a verification code right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
