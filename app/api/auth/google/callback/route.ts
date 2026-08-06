import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, setSessionCookie, signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getBaseUrl(req: NextRequest): string {
  const configuredUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // Fall through to the safe deployment default when configuration is invalid.
    }
  }

  const host = req.headers.get('host') || '';
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    return `http://${host}`;
  }
  return host ? `https://${host}` : 'http://localhost:3000';
}

function getCallbackUrl(req: NextRequest): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  return `${getBaseUrl(req)}/api/auth/google/callback`;
}

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const savedState = req.cookies.get('codeforge_google_state')?.value;

  const baseUrl = getBaseUrl(req);
  const failure = (reason: string) =>
    NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(reason)}`);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return failure('google_not_configured');
  }

  if (!code) {
    return failure('google_no_code');
  }

  // OAuth state is mandatory. Accepting a missing or mismatched state allows
  // an attacker to bind a victim's browser to an authorization response.
  if (!savedState || !state) {
    return failure('google_state_missing');
  }
  try {
    if (
      state.length !== savedState.length ||
      !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(savedState))
    ) {
      return failure('google_state_invalid');
    }
  } catch {
    return failure('google_state_invalid');
  }

  const callbackUrl = getCallbackUrl(req);

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = (await tokenResponse.text()).slice(0, 300);
      console.error('Google token exchange failed:', { status: tokenResponse.status, providerMessage: errBody });
      return failure('google_token_exchange_failed');
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string; error?: string };
    if (!tokens.access_token) {
      console.error('Google token exchange returned no access token:', { error: tokens.error || 'unknown_provider_error' });
      return failure('google_missing_access_token');
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!profileResponse.ok) return failure('google_profile_failed');

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      email_verified?: boolean;
    };

    if (!profile.sub || !profile.email) return failure('google_missing_profile');
    if (profile.email_verified === false) return failure('google_email_not_verified');

    const email = profile.email.trim().toLowerCase();

    // Upsert user: look up by googleId first, then email
    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // Link Google account to existing email user
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { googleId: profile.sub },
        });
      } else {
        // Create new user
        user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              email,
              name: (profile.name || email.split('@')[0]).slice(0, 80),
              googleId: profile.sub,
              passwordHash: hashPassword(crypto.randomUUID()),
              role: 'USER',
            },
          });
          // Initialize progress tracker
          await tx.userProgress.create({ data: { userId: created.id } });
          return created;
        });
      }
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    response.cookies.delete('codeforge_google_state');
    return setSessionCookie(response, token);
  } catch (error: unknown) {
    console.error('Google OAuth callback failed:', error);
    return failure('google_login_failed');
  }
}
