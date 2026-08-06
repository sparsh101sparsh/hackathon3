import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '../lib/rateLimit';

const scope = `rate-limit-test-${Date.now()}`;
const request = new NextRequest('http://localhost/api/test', {
  headers: { 'x-forwarded-for': '198.51.100.42' },
});

const first = checkRateLimit(request, scope, 1, 60_000);
assert.equal(first.allowed, true);
assert.ok(first.retryAfter >= 1);

const second = checkRateLimit(request, scope, 1, 60_000);
assert.equal(second.allowed, false);
assert.ok(second.retryAfter >= 1);

const responseScope = `${scope}-response`;
const firstResponseRequest = checkRateLimit(request, responseScope, 1, 60_000);
assert.equal(firstResponseRequest.allowed, true);
const response = rateLimitResponse(request, responseScope, 1, 60_000, 'limited');
assert.ok(response);
assert.equal(response.status, 429);
assert.ok(Number(response.headers.get('Retry-After')) >= 1);

console.log('Rate-limit verification: buckets reject excess requests and expose Retry-After.');
