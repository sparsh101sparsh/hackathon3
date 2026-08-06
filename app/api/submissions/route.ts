import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { executeCode, isSupportedLanguage } from '@/lib/piston';
import { ExecutionVerdict, TestCaseResult } from '@/lib/types';
import { getSessionFromRequest } from '@/lib/auth';
import { learnFromFailedAttempt } from '@/lib/revisionLearning';
import { outputsEquivalent } from '@/lib/output';
import { syncAcceptedProgress } from '@/lib/progress';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const limitResponse = rateLimitResponse(
    request,
    'submissions:create',
    20,
    60 * 1000,
    'Too many code submissions. Please try again shortly.',
  );
  if (limitResponse) return limitResponse;

  try {
    const body = await request.json();
    const { problemId, language, code } = body;

    if (typeof problemId !== 'string' || typeof language !== 'string' || typeof code !== 'string' || !problemId || !language.trim() || !code.trim()) {
      return NextResponse.json(
        { error: 'problemId, language, and code are required' },
        { status: 400 }
      );
    }
    if (!isSupportedLanguage(language)) {
      return NextResponse.json(
        { error: 'Unsupported language. Choose Python, C++, JavaScript, Java, or Go.' },
        { status: 400 },
      );
    }
    if (language.length > 32 || code.length > 100_000) {
      return NextResponse.json({ error: 'Language or code exceeds the allowed size' }, { status: 413 });
    }

    const session = getSessionFromRequest(request);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Sign in to submit code and save progress.' }, { status: 401 });
    }
    const activeUserId = session.userId;

    // Fetch problem and all test cases
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { testCases: true },
    });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const testCases = problem.testCases;
    if (testCases.length === 0) {
      return NextResponse.json(
        { error: 'Problem has no test cases configured' },
        { status: 400 }
      );
    }

    let overallVerdict: ExecutionVerdict = 'Accepted';
    let totalTime = 0;
    let maxMemory = 0;
    let passedCount = 0;
    let failedTestCaseInfo: {
      input: string;
      expectedOutput: string;
      actualOutput: string;
      error?: string;
    } | null = null;
    let failedTestCaseId: string | null = null;

    const testResults: TestCaseResult[] = [];

    for (const tc of testCases) {
      const execResult = await executeCode(language, code, tc.input, problem.slug);
      totalTime += execResult.executionTime;
      maxMemory = Math.max(maxMemory, execResult.memory);

      if (execResult.verdict === 'Compilation Error') {
        overallVerdict = 'Compilation Error';
        failedTestCaseId = tc.id;
        failedTestCaseInfo = {
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: execResult.stdout,
          error: execResult.stderr,
        };
        testResults.push({
          testCaseId: tc.id,
          passed: false,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: execResult.stdout,
          error: execResult.stderr,
          executionTime: execResult.executionTime,
          memory: execResult.memory,
          verdict: 'Compilation Error',
        });
        break;
      }

      if (execResult.verdict === 'Runtime Error') {
        if (overallVerdict === 'Accepted') overallVerdict = 'Runtime Error';
        if (!failedTestCaseInfo) {
          failedTestCaseId = tc.id;
          failedTestCaseInfo = {
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: execResult.stdout,
            error: execResult.stderr,
          };
        }
        testResults.push({
          testCaseId: tc.id,
          passed: false,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: execResult.stdout,
          error: execResult.stderr,
          executionTime: execResult.executionTime,
          memory: execResult.memory,
          verdict: 'Runtime Error',
        });
        continue;
      }

      if (execResult.verdict === 'TLE') {
        if (overallVerdict === 'Accepted') overallVerdict = 'TLE';
        if (!failedTestCaseInfo) {
          failedTestCaseId = tc.id;
          failedTestCaseInfo = {
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: execResult.stdout,
            error: 'Time Limit Exceeded',
          };
        }
        testResults.push({
          testCaseId: tc.id,
          passed: false,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: execResult.stdout,
          error: 'Time Limit Exceeded',
          executionTime: execResult.executionTime,
          memory: execResult.memory,
          verdict: 'TLE',
        });
        continue;
      }

      // Check string output matching
      if (outputsEquivalent(execResult.stdout, tc.expectedOutput)) {
        passedCount++;
        testResults.push({
          testCaseId: tc.id,
          passed: true,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: execResult.stdout,
          executionTime: execResult.executionTime,
          memory: execResult.memory,
          verdict: 'Accepted',
        });
      } else {
        if (overallVerdict === 'Accepted') {
          overallVerdict = 'Wrong Answer';
        }
        if (!failedTestCaseInfo) {
          failedTestCaseId = tc.id;
          failedTestCaseInfo = {
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: execResult.stdout,
          };
        }
        testResults.push({
          testCaseId: tc.id,
          passed: false,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: execResult.stdout,
          executionTime: execResult.executionTime,
          memory: execResult.memory,
          verdict: 'Wrong Answer',
        });
      }
    }

    const avgExecutionTime = Number((totalTime / testCases.length).toFixed(3));

    // Save submission to database
    const submission = await prisma.submission.create({
      data: {
        userId: activeUserId,
        problemId,
        code,
        language,
        status: overallVerdict,
        executionTime: avgExecutionTime,
        memory: maxMemory,
        failedTestCase: failedTestCaseInfo ? JSON.stringify(failedTestCaseInfo) : null,
      },
    });

    // Update user progress if Accepted
    if (overallVerdict === 'Accepted') {
      try {
        await syncAcceptedProgress(activeUserId);
      } catch (error: unknown) {
        console.error('Error updating user progress:', error);
      }

      // Keep successful problems in the deck while preserving any learned failure history.
      try {
        let parsedTopics = [];
        try { parsedTopics = JSON.parse(problem.topicTags || '[]'); } catch {}
        const pattern = parsedTopics[0] || 'General DSA';

        const nextDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day initial revision interval

        await prisma.revisionCard.upsert({
          where: {
            userId_problemId: {
              userId: activeUserId,
              problemId: problem.id,
            },
          },
          create: {
            userId: activeUserId,
            problemId: problem.id,
            pattern,
            keyTakeaway: `Mastered ${problem.title}. Review optimal approach and edge cases.`,
            dueDate: nextDueDate,
          },
          update: {
            dueDate: nextDueDate,
          },
        });
      } catch (error: unknown) {
        console.error('Error creating revision flashcard:', error);
      }
    }

    let learning: {
      failureCount: number;
      failureType: ExecutionVerdict;
      pattern: string;
    } | null = null;

    if (overallVerdict !== 'Accepted' && failedTestCaseInfo) {
      try {
        const failedTestCaseIsSample = testCases.find((testCase) => testCase.id === failedTestCaseId)?.isSample ?? false;
        const revisionFailedCase = failedTestCaseIsSample
          ? failedTestCaseInfo
          : {
              input: '[hidden test case]',
              expectedOutput: '[hidden test case]',
              actualOutput: failedTestCaseInfo.actualOutput,
              error: failedTestCaseInfo.error,
            };

        learning = await learnFromFailedAttempt({
          prisma,
          userId: activeUserId,
          problem,
          verdict: overallVerdict,
          failedTestCase: revisionFailedCase,
        });
      } catch (error: unknown) {
        console.error('Error learning from failed submission:', error);
      }
    }

    return NextResponse.json({
      id: submission.id,
      verdict: overallVerdict,
      passedCount,
      totalCount: testCases.length,
      executionTime: avgExecutionTime,
      memory: maxMemory,
      failedTestCase: failedTestCaseInfo
        ? (testCases.find((testCase) => testCase.id === failedTestCaseId)?.isSample
          ? failedTestCaseInfo
          : {
              input: '[hidden test case]',
              expectedOutput: '[hidden test case]',
              actualOutput: failedTestCaseInfo.actualOutput,
              error: failedTestCaseInfo.error,
            })
        : null,
      learning,
      testResults: testResults.map((result) => ({
        ...result,
        isSample: testCases.find((testCase) => testCase.id === result.testCaseId)?.isSample ?? false,
        input: testCases.find((testCase) => testCase.id === result.testCaseId)?.isSample ? result.input : '[hidden test case]',
        expectedOutput: testCases.find((testCase) => testCase.id === result.testCaseId)?.isSample ? result.expectedOutput : '[hidden test case]',
      })),
      createdAt: submission.createdAt,
    });
  } catch (error: unknown) {
    console.error('Error processing submission:', error);
    return NextResponse.json(
      { error: 'Submission processing error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId');
    const session = getSessionFromRequest(request);
    const rawPage = searchParams.get('page');
    const rawLimit = searchParams.get('limit');
    const page = rawPage === null ? 1 : Number(rawPage);
    const limit = rawLimit === null ? 20 : Number(rawLimit);
    if (!Number.isInteger(page) || page < 1 || page > 10_000) {
      return NextResponse.json({ error: 'page must be an integer between 1 and 10000' }, { status: 400 });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'limit must be an integer between 1 and 100' }, { status: 400 });
    }

    const whereClause: Prisma.SubmissionWhereInput = {};
    if (problemId) whereClause.problemId = problemId;
    whereClause.userId = session?.userId || 'guest';

    const total = await prisma.submission.count({ where: whereClause });
    const submissions = await prisma.submission.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    const safeSubmissions = submissions.map((submission) => {
      let safeFailedTestCase = submission.failedTestCase;
      if (submission.failedTestCase) {
        try {
          const parsed = JSON.parse(submission.failedTestCase) as { actualOutput?: string; error?: string };
          safeFailedTestCase = JSON.stringify({
            input: '[hidden test case]',
            expectedOutput: '[hidden test case]',
            actualOutput: parsed.actualOutput || '',
            error: parsed.error,
          });
        } catch {
          safeFailedTestCase = JSON.stringify({
            input: '[hidden test case]',
            expectedOutput: '[hidden test case]',
            actualOutput: '',
          });
        }
      }
      return { ...submission, failedTestCase: safeFailedTestCase };
    });

    return NextResponse.json({
      submissions: safeSubmissions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: unknown) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
