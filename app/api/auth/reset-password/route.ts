import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie, signToken, verifyVerificationCode } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const requestLimit = checkRateLimit(req, 'auth:reset-password', 8, 15 * 60 * 1000);
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.', retryAfter: requestLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(requestLimit.retryAfter) } },
      );
    }
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A valid password reset request is required' }, { status: 400 });
    }
    const { email, code, newPassword } = body;

    if (typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Email, verification code, and new password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit verification code' }, { status: 400 });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json(
        { error: 'New password must be between 8 and 128 characters long' },
        { status: 400 }
      );
    }

    // Verify the active reset OTP against its HMAC digest. Legacy plaintext
    // records remain compatible until they naturally expire.
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose: 'RESET_PASSWORD',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const codeMatches = verification && (
      verifyVerificationCode(cleanCode, verification.code) ||
      (verification.code.length === 6 && verification.code === cleanCode)
    );

    if (!verification || !codeMatches) {
      if (verification) {
        await prisma.emailVerification.delete({ where: { id: verification.id } }).catch(() => undefined);
      }
      return NextResponse.json(
        { error: 'Invalid or expired password reset code. Please request a new code.' },
        { status: 400 }
      );
    }

    const consumedVerification = await prisma.emailVerification.deleteMany({
      where: { id: verification.id },
    });
    if (consumedVerification.count !== 1) {
      return NextResponse.json(
        { error: 'This password reset code has already been used. Please request a new code.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email address' }, { status: 404 });
    }

    // Hash new password and update user record
    const passwordHash = hashPassword(newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Cleanup used RESET_PASSWORD verification codes only
    await prisma.emailVerification.deleteMany({ where: { email: cleanEmail, purpose: 'RESET_PASSWORD' } });

    // Issue JWT session cookie
    const token = signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });

    return setSessionCookie(response, token);
  } catch (error: unknown) {
    console.error('Error in /api/auth/reset-password:', error);
    return NextResponse.json(
      { error: 'Password reset is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
