import { NextResponse } from 'next/server';
import { hasConfiguredEmailVerification } from '@/lib/email';

export const dynamic = 'force-dynamic';

function healthResponse(
  body: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function GET() {
  const hasDatabase = Boolean(process.env.DATABASE_URL?.trim());
  const hasJwtSecret = Boolean(process.env.JWT_SECRET?.trim());
  const hasEmailVerification = hasConfiguredEmailVerification();
  const requiresEmailVerification = process.env.NODE_ENV === 'production';

  if (!hasDatabase || !hasJwtSecret || (requiresEmailVerification && !hasEmailVerification)) {
    return healthResponse(
      {
        status: 'not_ready',
        checks: {
          database: hasDatabase ? 'configured' : 'missing',
          authentication: hasJwtSecret ? 'configured' : 'missing',
          emailVerification: hasEmailVerification ? 'configured' : 'missing',
        },
      },
      503,
    );
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;

    return healthResponse({
      status: 'ok',
      checks: {
        database: 'ok',
        authentication: 'configured',
        emailVerification: hasEmailVerification ? 'configured' : 'dev_fallback',
      },
    }, 200);
  } catch (error: unknown) {
    console.error('Health check database probe failed:', error instanceof Error ? error.message : 'unknown error');
    return healthResponse(
      {
        status: 'not_ready',
        checks: {
          database: 'unavailable',
          authentication: 'configured',
          emailVerification: hasEmailVerification ? 'configured' : 'missing',
        },
      },
      503,
    );
  }
}
