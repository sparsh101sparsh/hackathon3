import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie, signToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const requestLimit = checkRateLimit(req, 'auth:password-login', 10, 15 * 60 * 1000);
    if (!requestLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Please try again later.', retryAfter: requestLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(requestLimit.retryAfter) } },
      );
    }
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A valid sign-in request is required' }, { status: 400 });
    }
    const { email, password } = body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || password.length > 128) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last active date in user progress if exists
    await prisma.userProgress.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        solvedEasy: 0,
        solvedMedium: 0,
        solvedHard: 0,
        streak: 1,
        lastActiveDate: new Date(),
      },
      update: {
        lastActiveDate: new Date(),
      },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return setSessionCookie(response, token);
  } catch (error: unknown) {
    console.error('Error in /api/auth/login:', error);
    return NextResponse.json(
      { error: 'Sign-in is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
