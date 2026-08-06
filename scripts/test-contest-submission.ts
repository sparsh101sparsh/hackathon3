import { NextRequest } from 'next/server';
import { POST as submitContestHandler } from '../app/api/contests/[id]/submit/route';
import { GET as getSubmissionsHandler } from '../app/api/submissions/route';
import { hashPassword, signToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

async function runTests() {
  const timestamp = Date.now();
  const email = `contest-submit-${timestamp}@codeforge.dev`;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    const problem = await prisma.problem.findFirst({
      where: { title: 'Two Sum' },
      include: { codeTemplates: true, testCases: true },
    });
    if (!problem || problem.testCases.length === 0) {
      throw new Error('Two Sum test data is required for contest submission verification');
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: 'Contest Submission Test User',
        passwordHash: hashPassword('ContestPass123!'),
        role: 'USER',
      },
    });
    const contest = await prisma.contest.create({
      data: {
        title: `Contest Submission Verification ${timestamp}`,
        description: 'Temporary contest submission verification',
        startTime: new Date(Date.now() - 60_000),
        endTime: new Date(Date.now() + 600_000),
        status: 'ACTIVE',
        contestProblems: {
          create: { problemId: problem.id, points: 275, order: 1 },
        },
      },
      include: { contestProblems: true },
    });
    const participant = await prisma.contestParticipant.create({
      data: {
        contestId: contest.id,
        userId: user.id,
        name: user.name,
        oldRating: 1200,
        newRating: 1200,
      },
    });
    const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const headers = { Cookie: `codeforge_session=${token}`, 'Content-Type': 'application/json' };
    const solution = `class Solution:\n    def twoSum(self, nums, target):\n        for i in range(len(nums)):\n            for j in range(i + 1, len(nums)):\n                if nums[i] + nums[j] == target:\n                    return [i, j]\n`;

    const request = new NextRequest(`http://localhost:3000/api/contests/${contest.id}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ problemId: problem.id, language: 'python', code: solution }),
    });
    const response = await submitContestHandler(request, { params: Promise.resolve({ id: contest.id }) });
    const data = await response.json();
    assert(response.status === 200, 'Accepted contest submission returns HTTP 200');
    assert(data.verdict === 'Accepted', 'Contest judge returns Accepted for a correct solution');
    assert(data.scoreAwarded === 275, 'Contest score comes from persisted contest problem points');

    const savedParticipant = await prisma.contestParticipant.findUnique({ where: { id: participant.id } });
    assert(savedParticipant?.score === 275, 'Accepted contest score is persisted for the participant');
    const savedProgress = await prisma.userProgress.findUnique({ where: { userId: user.id } });
    assert(savedProgress?.solvedEasy === 1, 'Accepted contest solve updates dashboard progress exactly once');

    const duplicateRequest = new NextRequest(`http://localhost:3000/api/contests/${contest.id}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ problemId: problem.id, language: 'python', code: solution }),
    });
    const duplicateResponse = await submitContestHandler(duplicateRequest, { params: Promise.resolve({ id: contest.id }) });
    const duplicateData = await duplicateResponse.json();
    assert(duplicateResponse.status === 409 && duplicateData.alreadySolved === true, 'Duplicate accepted solve is rejected');
    const unchangedProgress = await prisma.userProgress.findUnique({ where: { userId: user.id } });
    assert(unchangedProgress?.solvedEasy === 1, 'Rejected duplicate solve does not inflate dashboard progress');

    await prisma.submission.create({
      data: {
        userId: user.id,
        problemId: problem.id,
        code: 'broken',
        language: 'python',
        status: 'Wrong Answer',
        failedTestCase: JSON.stringify({ input: 'secret input', expectedOutput: 'secret output', actualOutput: 'wrong' }),
      },
    });
    const historyRequest = new NextRequest(`http://localhost:3000/api/submissions?problemId=${problem.id}`, {
      headers: { Cookie: `codeforge_session=${token}` },
    });
    const historyResponse = await getSubmissionsHandler(historyRequest);
    const historyData = await historyResponse.json();
    const historyFailure = historyData.submissions?.find((submission: { failedTestCase?: string }) => submission.failedTestCase)?.failedTestCase || '';
    assert(historyResponse.status === 200 && !historyFailure.includes('secret input') && !historyFailure.includes('secret output'), 'Submission history hides stored test-case inputs and expected outputs');

    await prisma.submission.deleteMany({ where: { userId: user.id } });
    await prisma.userProgress.deleteMany({ where: { userId: user.id } });
    await prisma.contest.delete({ where: { id: contest.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`\nContest submission verification: ${passed} PASSED, ${failed} FAILED`);
    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Fatal error running contest submission verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
