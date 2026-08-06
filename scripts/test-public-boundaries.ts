import { NextRequest } from 'next/server';
import { GET as leaderboardHandler } from '../app/api/leaderboard/route';
import { GET as problemsHandler } from '../app/api/problems/route';
import { GET as submissionsHandler } from '../app/api/submissions/route';
import { POST as executeHandler } from '../app/api/execute/route';
import { GET as roomHandler } from '../app/api/rooms/[code]/route';
import { GET as contestHandler } from '../app/api/contests/[id]/route';
import { GET as contestLeaderboardHandler } from '../app/api/contests/[id]/leaderboard/route';
import { GET as profileHandler } from '../app/api/leaderboard/[id]/route';
import { POST as roomJoinHandler } from '../app/api/rooms/join/route';
import { prisma } from '../lib/prisma';

async function runTest() {
  let passed = 0;
  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
    passed += 1;
    console.log(`  ✓ PASSED: ${message}`);
  };

  try {
    const leaderboardResponse = await leaderboardHandler(
      new NextRequest('http://localhost:3000/api/leaderboard'),
    );
    const leaderboard = await leaderboardResponse.json();
    assert(leaderboardResponse.status === 200, 'Public leaderboard remains readable');
    assert(
      (leaderboard.leaderboard || []).every((entry: unknown) =>
        !entry || typeof entry !== 'object' || !Object.prototype.hasOwnProperty.call(entry, 'email'),
      ),
      'Public leaderboard does not expose account email addresses',
    );
    assert(
      (leaderboard.leaderboard || []).every((entry: { streak?: unknown; consistency?: unknown }) =>
        typeof entry.streak === 'number' && typeof entry.consistency === 'number',
      ),
      'Public leaderboard exposes measurable streak and consistency signals',
    );
    const registeredUsers = await prisma.user.findMany({ select: { id: true } });
    const publicIds = new Set((leaderboard.leaderboard || []).map((entry: { id: string }) => entry.id));
    assert(registeredUsers.every((user) => publicIds.has(user.id)), 'Every registered user appears on the public leaderboard');
    const firstProfileId = leaderboard.leaderboard?.[0]?.id;
    if (firstProfileId) {
      const profileResponse = await profileHandler(
        new NextRequest(`http://localhost:3000/api/leaderboard/${firstProfileId}`),
        { params: Promise.resolve({ id: firstProfileId }) },
      );
      const profile = await profileResponse.json();
      assert(profileResponse.status === 200 && profile.profile?.id === firstProfileId, 'Public profile loads from a leaderboard entry');
      assert(!Object.prototype.hasOwnProperty.call(profile.profile || {}, 'email'), 'Public profile does not expose account email addresses');
      assert(typeof profile.profile?.accuracy === 'number' && typeof profile.profile?.consistency === 'number', 'Public profile exposes aggregate performance metrics');
    }

    const profileProblem = await prisma.problem.findFirst({ select: { id: true } });
    if (profileProblem) {
      const activityOnlyUserId = `activity-only-${Date.now()}`;
      let activitySubmissionId: string | null = null;
      try {
        const activitySubmission = await prisma.submission.create({
          data: {
            userId: activityOnlyUserId,
            problemId: profileProblem.id,
            code: 'print("ok")',
            language: 'python',
            status: 'Accepted',
          },
          select: { id: true },
        });
        activitySubmissionId = activitySubmission.id;

        const activityProfileResponse = await profileHandler(
          new NextRequest(`http://localhost:3000/api/leaderboard/${activityOnlyUserId}`),
          { params: Promise.resolve({ id: activityOnlyUserId }) },
        );
        const activityProfile = await activityProfileResponse.json();
        assert(
          activityProfileResponse.status === 200 && activityProfile.profile?.id === activityOnlyUserId,
          'Public profile loads for activity-only leaderboard identities',
        );
        assert(
          activityProfile.profile?.name === `Coder (${activityOnlyUserId.slice(0, 6)})`,
          'Activity-only public profiles use generated display names',
        );
      } finally {
        if (activitySubmissionId) {
          await prisma.submission.delete({ where: { id: activitySubmissionId } }).catch(() => undefined);
        }
      }
    }

    const problemsResponse = await problemsHandler(
      new NextRequest('http://localhost:3000/api/problems?page=2&limit=3'),
    );
    const problems = await problemsResponse.json();
    assert(problemsResponse.status === 200, 'Problem catalog remains readable');
    assert(problems.problems.length <= 3 && problems.page === 2 && problems.limit === 3, 'Problem catalog paginates at the database page size');
    assert(problems.total >= problems.problems.length && problems.totalPages >= 1, 'Problem pagination metadata remains consistent');

    const oversizedSearchResponse = await problemsHandler(
      new NextRequest(`http://localhost:3000/api/problems?search=${'x'.repeat(161)}`),
    );
    assert(oversizedSearchResponse.status === 413, 'Oversized problem searches are rejected before database work');

    const malformedSubmissionPageResponse = await submissionsHandler(
      new NextRequest('http://localhost:3000/api/submissions?page=abc&limit=20'),
    );
    assert(malformedSubmissionPageResponse.status === 400, 'Malformed submission pagination is rejected before database work');

    const malformedExecutionResponse = await executeHandler(
      new NextRequest('http://localhost:3000/api/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language: 'python', code: 'print(1)', customInput: { invalid: true } }),
      }),
    );
    assert(malformedExecutionResponse.status === 400, 'Malformed execution input is rejected before provider calls');

    const roomResponse = await roomHandler(
      new NextRequest('http://localhost:3000/api/rooms/BATTLE-UNKNOWN'),
      { params: Promise.resolve({ code: 'BATTLE-UNKNOWN' }) },
    );
    assert(roomResponse.status === 401, 'Unauthenticated room reads are rejected before room lookup');

    const contestResponse = await contestHandler(
      new NextRequest('http://localhost:3000/api/contests/contest-that-does-not-exist'),
      { params: Promise.resolve({ id: 'contest-that-does-not-exist' }) },
    );
    assert(contestResponse.status === 404, 'Invalid contest IDs return not found instead of another contest');

    const contestLeaderboardResponse = await contestLeaderboardHandler(
      new NextRequest('http://localhost:3000/api/contests/contest-that-does-not-exist/leaderboard'),
      { params: Promise.resolve({ id: 'contest-that-does-not-exist' }) },
    );
    assert(contestLeaderboardResponse.status === 404, 'Invalid contest leaderboard IDs return not found');

    const anonymousJoinResponse = await roomJoinHandler(
      new NextRequest('http://localhost:3000/api/rooms/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomCode: 'BATTLE-UNKNOWN' }),
      }),
    );
    assert(anonymousJoinResponse.status === 401, 'Anonymous room joins are rejected before room lookup');

    console.log(`Public boundary verification: ${passed} passed.`);
  } finally {
    await prisma.$disconnect();
  }
}

runTest().catch((error) => {
  console.error('Public boundary verification failed:', error);
  process.exit(1);
});
