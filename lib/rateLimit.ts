import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function clientAddress(request: NextRequest): string {
  const session = getSessionFromRequest(request);
  if (session?.userId) return `user:${session.userId}`;
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'shared-request-origin';
}

export function checkRateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export function rateLimitResponse(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
  message = 'Request rate limit reached. Please try again shortly.',
): NextResponse | null {
  const result = checkRateLimit(request, scope, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: message, retryAfter: result.retryAfter },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
  );
}
