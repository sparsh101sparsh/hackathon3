import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { hashPassword, signToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

for (const key of ['FREEMODEL_API_KEY', 'FREEMODEL_API_KEY_2', 'FREEMODEL_API_KEY_3', 'PRIMARY_AI_API_KEY', 'PRIMARY_AI_API_KEY_2']) {
  process.env[key] = '';
}

async function runTest() {
  const { POST } = await import('../app/api/ai/commentator/route');

  async function jsonPost(body: object) {
    const response = await POST(new NextRequest('http://localhost:3000/api/ai/commentator', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }));
    return { response, body: await response.json() };
  }

  const publicResult = await jsonPost({
    roomCode: 'BATTLE-TEST',
    eventType: 'SAMPLE_PASSED',
    participants: [
      { userId: 'u1', userName: 'Ada', score: 150, solved: 1, progress: 'SOLVED' },
      { userId: 'u2', userName: 'Grace', score: 50, solved: 0, progress: 'CODING' },
    ],
    problemTitle: 'Two Sum',
    language: 'python',
    linesOfCode: 24,
    timeRemainingSeconds: 512,
    executionResult: { verdict: 'Accepted' },
    userName: 'Ada',
  });

  assert.equal(publicResult.response.status, 200, 'fallback commentator request succeeds');
  assert.equal(publicResult.body.success, true, 'fallback response is marked successful');
  assert.equal(typeof publicResult.body.commentary, 'string', 'fallback returns commentary text');
  assert.ok(publicResult.body.commentary.length >= 8, 'fallback commentary is non-empty');
  assert.ok(['high', 'medium', 'low'].includes(publicResult.body.hypeLevel), 'hype level is normalized');

  const analysisStart = Date.now();
  const analysisResult = await jsonPost({
    roomCode: 'BATTLE-TEST',
    eventType: 'CODE_ANALYSIS',
    participants: [
      { userId: 'u1', userName: 'Ada', score: 150, solved: 1, progress: 'CODING' },
      { userId: 'u2', userName: 'Grace', score: 50, solved: 0, progress: 'CODING' },
    ],
    problemTitle: 'Two Sum',
    language: 'cpp',
    linesOfCode: 18,
    timeRemainingSeconds: 301,
    codeAnalysis: {
      nonEmptyLineCount: 18,
      functionCount: 1,
      loopCount: 1,
      conditionalCount: 2,
      phase: 'debugging',
      possibleIssue: 'missing empty input guard',
      signature: 'analysis-test',
    },
    userName: 'Ada',
  });

  assert.equal(analysisResult.response.status, 200, 'code-analysis fallback succeeds');
  assert.equal(analysisResult.body.success, true, 'code-analysis response is successful');
  assert.equal(analysisResult.body.hypeLevel, 'medium', 'code-analysis warnings raise medium hype');
  assert.ok(Date.now() - analysisStart < 1000, 'no-provider code-analysis fallback is fast');
  assert.match(
    analysisResult.body.commentary,
    /loop|branch|live lines|debugging|input guard/i,
    'code-analysis commentary reflects static analysis summary',
  );

  const malformedResponse = await POST(new NextRequest('http://localhost:3000/api/ai/commentator', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"eventType":',
  }));
  const malformedBody = await malformedResponse.json();
  assert.equal(malformedResponse.status, 200, 'malformed JSON returns fallback instead of 500');
  assert.equal(malformedBody.success, true, 'malformed JSON fallback keeps success contract');

  const hugeResult = await jsonPost({
    roomCode: 'BATTLE-TEST',
    eventType: 'CODE_ANALYSIS',
    participants: [null, 'bad', { userName: 'Ada', score: Number.POSITIVE_INFINITY }],
    problemTitle: 'Two Sum',
    language: 'cpp',
    linesOfCode: Number.POSITIVE_INFINITY,
    codeAnalysis: {
      nonEmptyLineCount: 999999999,
      loopCount: 999999999,
      possibleIssue: 'x'.repeat(1000),
      phase: 'y'.repeat(500),
      hasReturn: 'true',
    },
  });
  assert.equal(hugeResult.response.status, 200, 'oversized/suspicious analysis payload is clamped');
  assert.doesNotMatch(hugeResult.body.commentary, /999999999|Infinity/, 'unsafe numeric values do not leak');

  const originalFetch = global.fetch;
  process.env.PRIMARY_AI_API_KEY = 'fake-timeout-key';
  global.fetch = ((url, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal as AbortSignal | undefined;
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  })) as typeof fetch;

  const timeoutStart = Date.now();
  const timeoutResult = await jsonPost({
    roomCode: 'BATTLE-TIMEOUT',
    eventType: 'CODE_ANALYSIS',
    participants: [{ userId: 'u1', userName: 'Ada', score: 10 }],
    problemTitle: 'Two Sum',
    language: 'cpp',
    linesOfCode: 12,
    codeAnalysis: { nonEmptyLineCount: 12, loopCount: 1, phase: 'implementation', signature: 'slow-provider' },
  });
  global.fetch = originalFetch;
  process.env.PRIMARY_AI_API_KEY = '';

  assert.equal(timeoutResult.response.status, 200, 'provider timeout still returns fallback');
  assert.equal(timeoutResult.body.success, true, 'provider timeout preserves success contract');
  assert.ok(Date.now() - timeoutStart < 5000, 'provider timeout path stays under 5 seconds');

  const privateResult = await jsonPost({
    roomCode: 'BATTLE-PRIVATE',
    eventType: 'TICK',
    participants: [{ userId: 'u1', userName: 'Ada', score: 0 }],
    problemTitle: 'Two Sum',
    privacyMode: 'private_room',
  });

  assert.equal(privateResult.response.status, 401, 'private room commentary requires authentication');
  assert.match(privateResult.body.error, /Sign in/i, 'private room auth failure is explicit');

  const timestamp = Date.now();
  const participant = await prisma.user.create({
    data: {
      email: `commentator-participant-${timestamp}@codeforge.dev`,
      name: 'Commentator Participant',
      passwordHash: hashPassword('CommentatorPass123!'),
    },
  });
  const outsider = await prisma.user.create({
    data: {
      email: `commentator-outsider-${timestamp}@codeforge.dev`,
      name: 'Commentator Outsider',
      passwordHash: hashPassword('CommentatorPass123!'),
    },
  });
  const room = await prisma.customRoom.create({
    data: {
      code: `BATTLE-COMM${timestamp.toString().slice(-5)}`,
      name: 'Commentator Verification Room',
      hostName: participant.name,
      maxPlayers: 10,
      difficulty: 'MIXED',
      problemCount: 1,
      status: 'IN_PROGRESS',
      problemIds: '[]',
      mode: 'SQUAD',
      durationSeconds: 900,
      startedAt: new Date(),
      participants: { create: { userId: participant.id, userName: participant.name } },
    },
  });

  try {
    const participantToken = signToken({ id: participant.id, email: participant.email, name: participant.name, role: participant.role });
    const outsiderToken = signToken({ id: outsider.id, email: outsider.email, name: outsider.name, role: outsider.role });
    const privateBody = {
      roomCode: room.code,
      eventType: 'CODE_ANALYSIS',
      participants: [{ userId: participant.id, userName: participant.name, score: 0 }],
      problemTitle: 'Two Sum',
      privacyMode: 'private_room',
      codeAnalysis: { nonEmptyLineCount: 9, phase: 'drafting', signature: 'private-analysis' },
    };

    const outsiderResponse = await POST(new NextRequest('http://localhost:3000/api/ai/commentator', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `codeforge_session=${outsiderToken}` },
      body: JSON.stringify(privateBody),
    }));
    assert.equal(outsiderResponse.status, 403, 'signed-in non-participant cannot use private room commentary');

    const participantResponse = await POST(new NextRequest('http://localhost:3000/api/ai/commentator', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `codeforge_session=${participantToken}` },
      body: JSON.stringify(privateBody),
    }));
    const participantBody = await participantResponse.json();
    assert.equal(participantResponse.status, 200, 'signed-in participant can use private room commentary');
    assert.equal(participantBody.success, true, 'private participant receives successful commentary');
    assert.doesNotMatch(participantBody.commentary, new RegExp(room.code, 'i'), 'private commentary does not expose the room code');
  } finally {
    await prisma.customRoom.delete({ where: { id: room.id } });
    await prisma.user.deleteMany({ where: { id: { in: [participant.id, outsider.id] } } });
  }

  const liveCommentatorSource = fs.readFileSync(path.join(process.cwd(), 'components/contests/LiveCommentator.tsx'), 'utf8');
  assert.ok(liveCommentatorSource.includes('codeAnalysis: codeAnalysisRef.current'), 'client sends static analysis summary');
  assert.ok(liveCommentatorSource.includes("fetchCommentary('CODE_ANALYSIS')"), 'client triggers code-analysis commentary events');
  assert.ok(liveCommentatorSource.includes('}, 5000);'), 'client schedules code analysis on a 5-second beat');
  assert.ok(!liveCommentatorSource.includes('codeSnippet: codeSnippet') && !liveCommentatorSource.includes('codeSnippet: codeSnippetRef'), 'client does not send raw code snippet');

  await prisma.$disconnect();
  console.log('AI commentator route: resilience, code-analysis, and private-room checks passed.');
}

runTest().catch((error) => {
  console.error('AI commentator verification failed:', error);
  prisma.$disconnect().catch(() => undefined).finally(() => process.exit(1));
});
