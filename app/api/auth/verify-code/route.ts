import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie, signToken, verifyVerificationCode } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const requestLimit = checkRateLimit(req, 'auth:verify-code', 12, 10 * 60 * 1000);
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please request a new code later.', retryAfter: requestLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(requestLimit.retryAfter) } },
      );
    }
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A valid verification request is required' }, { status: 400 });
    }
    const { email, code, purpose = 'SIGNUP', name, password } = body;

    if (typeof email !== 'string' || typeof code !== 'string') {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }
    if ((name !== undefined && typeof name !== 'string') || (password !== undefined && typeof password !== 'string')) {
      return NextResponse.json({ error: 'Name and password must be text values' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    // Must be exactly 6 digits
    if (!/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit verification code' }, { status: 400 });
    }

    const validPurposes = ['SIGNUP', 'LOGIN', 'RESET_PASSWORD'];
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose specified' }, { status: 400 });
    }

    // Fetch the active record without querying by plaintext code. New records
    // contain an HMAC digest; the short legacy fallback handles old pending rows.
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const codeMatches = verification && (
      verifyVerificationCode(cleanCode, verification.code) ||
      // Legacy records created before hashed OTP storage are short plaintext codes.
      (verification.code.length === 6 && verification.code === cleanCode)
    );

    if (!verification || !codeMatches) {
      // Invalidate the pending code after a failed attempt. This makes a stolen
      // email address unable to brute-force the six-digit value; the user can
      // request a fresh code after the resend cooldown.
      if (verification) {
        await prisma.emailVerification.delete({ where: { id: verification.id } }).catch(() => undefined);
      }
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please request a new code.' },
        { status: 400 }
      );
    }

    // Consume the exact verification row before creating a session or account.
    // A conditional delete makes concurrent requests single-use even when both
    // requests read the same valid row before either branch finishes.
    const consumedVerification = await prisma.emailVerification.deleteMany({
      where: { id: verification.id },
    });
    if (consumedVerification.count !== 1) {
      return NextResponse.json(
        { error: 'This verification code has already been used. Please request a new code.' },
        { status: 400 },
      );
    }

    if (purpose === 'SIGNUP') {
      // Check if account already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        // Cleanup only SIGNUP verification codes for this email
        await prisma.emailVerification.deleteMany({ where: { email: cleanEmail, purpose: 'SIGNUP' } });
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please sign in.' },
          { status: 409 }
        );
      }

      const finalName = (verification.name || name || cleanEmail.split('@')[0] || 'Coder').trim();

      // Require password — either from the verification record or from the request body
      const rawPassword = password || null;
      const passwordHash = verification.passwordHash || (rawPassword ? hashPassword(rawPassword) : null);

      if (!passwordHash) {
        return NextResponse.json(
          { error: 'Password is required to create your account. Please go back and set a password.' },
          { status: 400 }
        );
      }

      // Create new user and UserProgress transactionally — also delete verification code within the transaction
      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            name: finalName,
            email: cleanEmail,
            passwordHash,
            role: 'USER',
          },
        });

        await tx.userProgress.create({
          data: { userId: createdUser.id },
        });

        // Delete only SIGNUP codes for this email within the transaction
        await tx.emailVerification.deleteMany({ where: { email: cleanEmail, purpose: 'SIGNUP' } });

        return createdUser;
      });

      // Sign JWT session token
      const token = signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      return setSessionCookie(response, token);
    } else {
      // LOGIN flow via Verification Code
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'No account found with this email. Please sign up first.' },
          { status: 404 }
        );
      }

      // Delete only LOGIN codes for this email — don't touch SIGNUP or RESET_PASSWORD codes
      await prisma.emailVerification.deleteMany({ where: { email: cleanEmail, purpose: 'LOGIN' } });

      const token = signToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Authenticated successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      return setSessionCookie(response, token);
    }
  } catch (error: unknown) {
    console.error('Error in /api/auth/verify-code:', error);
    return NextResponse.json(
      { error: 'Verification is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
