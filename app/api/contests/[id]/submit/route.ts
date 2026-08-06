import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { executeCode, isSupportedLanguage } from '@/lib/piston';
import { ExecutionVerdict } from '@/lib/types';
import { normalizeOutput } from '@/lib/output';
import { syncAcceptedProgress } from '@/lib/progress';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const limitResponse = rateLimitResponse(
      request,
      'contest:submit',
      12,
      60 * 1000,
      'Contest submission rate limit reached. Please try again shortly.',
    );
    if (limitResponse) return limitResponse;

    const { id: contestId } = await params;
    const session = getSessionFromRequest(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Sign in to submit contest solutions.' }, { status: 401 });
    }

    const body = await request.json();
    const { problemId, language, code } = body;
    if (typeof problemId !== 'string' || typeof language !== 'string' || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'problemId, language, and code are required' }, { status: 400 });
    }
    if (!isSupportedLanguage(language)) {
      return NextResponse.json(
        { error: 'Unsupported language. Choose Python, C++, JavaScript, Java, or Go.' },
        { status: 400 },
      );
    }
    if (code.length > 100_000) {
      return NextResponse.json({ error: 'Code exceeds the 100KB submission limit' }, { status: 413 });
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        contestProblems: {
          include: { problem: { include: { testCases: true } } },
        },
      },
    });

    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    const now = new Date();
    if (now < contest.startTime || now > contest.endTime) {
      return NextResponse.json({ error: 'Contest submissions are only accepted while the contest is active.' }, { status: 409 });
    }

    const participant = await prisma.contestParticipant.findFirst({
      where: { contestId: contest.id, userId: session.userId },
    });
    if (!participant) {
      return NextResponse.json({ error: 'Register for the contest before submitting.' }, { status: 403 });
    }

    const contestProblem = contest.contestProblems.find((item) => item.problemId === problemId);
    if (!contestProblem) {
      return NextResponse.json({ error: 'This problem is not part of the contest.' }, { status: 400 });
    }

    const previousAccepted = await prisma.submission.findFirst({
      where: {
        userId: session.userId,
        problemId,
        status: 'Accepted',
        createdAt: { gte: contest.startTime, lte: contest.endTime },
      },
      select: { id: true },
    });
    if (previousAccepted) {
      return NextResponse.json({ error: 'You have already solved this contest problem.', alreadySolved: true }, { status: 409 });
    }

    const testCases = contestProblem.problem.testCases;
    if (testCases.length === 0) {
      return NextResponse.json({ error: 'This contest problem has no test cases configured.' }, { status: 400 });
    }

    let verdict: ExecutionVerdict = 'Accepted';
    let passedCount = 0;
    let totalTime = 0;
    let maxMemory = 0;
    let failedTestCase: { input: string; expectedOutput: string; actualOutput: string; error?: string } | null = null;

    for (const testCase of testCases) {
      const result = await executeCode(language, code, testCase.input, contestProblem.problem.slug);
      totalTime += result.executionTime;
      maxMemory = Math.max(maxMemory, result.memory);

      const outputMatches = result.verdict !== 'Compilation Error' &&
        result.verdict !== 'Runtime Error' &&
        result.verdict !== 'TLE' &&
        normalizeOutput(result.stdout) === normalizeOutput(testCase.expectedOutput);

      if (outputMatches) {
        passedCount += 1;
        continue;
      }

      verdict = result.verdict === 'Compilation Error' || result.verdict === 'Runtime Error' || result.verdict === 'TLE'
        ? result.verdict
        : 'Wrong Answer';
      failedTestCase = {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.stdout,
        error: result.stderr || undefined,
      };
      break;
    }

    const executionTime = Number((totalTime / testCases.length).toFixed(3));
    // Re-check and award points atomically after judging. The first lookup is
    // only an early exit; concurrent requests can otherwise both pass it.
    const persistence = await prisma.$transaction(async (tx) => {
      const acceptedInContest = verdict === 'Accepted'
        ? await tx.submission.findFirst({
          where: {
            userId: session.userId,
            problemId,
            status: 'Accepted',
            createdAt: { gte: contest.startTime, lte: contest.endTime },
          },
          select: { id: true },
        })
        : null;

      if (acceptedInContest) {
        return { alreadySolved: true as const, submission: null, scoreAwarded: 0, participant };
      }

      const createdSubmission = await tx.submission.create({
        data: {
          userId: session.userId,
          problemId,
          code,
          language,
          status: verdict,
          executionTime,
          memory: maxMemory,
          failedTestCase: failedTestCase ? JSON.stringify(failedTestCase) : null,
        },
      });

      if (verdict !== 'Accepted') {
        return { alreadySolved: false as const, submission: createdSubmission, scoreAwarded: 0, participant };
      }

      const scoreAwarded = contestProblem.points;
      const updatedParticipant = await tx.contestParticipant.update({
        where: { id: participant.id },
        data: {
          score: { increment: scoreAwarded },
          finishTime: participant.finishTime || new Date(),
        },
      });

      return { alreadySolved: false as const, submission: createdSubmission, scoreAwarded, participant: updatedParticipant };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (persistence.alreadySolved || !persistence.submission) {
      return NextResponse.json({ error: 'You have already solved this contest problem.', alreadySolved: true }, { status: 409 });
    }

    const submission = persistence.submission;
    const scoreAwarded = persistence.scoreAwarded;
    const updatedParticipant = persistence.participant;

    if (verdict === 'Accepted') {
      try {
        await syncAcceptedProgress(session.userId);
      } catch (progressError) {
        console.error('Failed to update contest solver progress:', progressError);
      }
    }

    return NextResponse.json({
      id: submission.id,
      verdict,
      passedCount,
      totalCount: testCases.length,
      executionTime,
      memory: maxMemory,
      scoreAwarded,
      participant: updatedParticipant,
      failedTestCase: failedTestCase
        ? {
            input: '[hidden test case]',
            expectedOutput: '[hidden test case]',
            actualOutput: failedTestCase.actualOutput,
            error: failedTestCase.error,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error('Error processing contest submission:', error);
    return NextResponse.json({ error: 'Failed to process contest submission' }, { status: 500 });
  }
}
