import { ExecutionVerdict } from '@/lib/types';
import { PrismaClient } from '@prisma/client';

export interface FailureSnapshot {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
}

export interface RevisionLearning {
  failureType: ExecutionVerdict;
  pattern: string;
  keyTakeaway: string;
  error: string | null;
  stuckPoint: string;
}

export interface RevisionDeckLearningResult {
  failureCount: number;
  failureType: ExecutionVerdict;
  pattern: string;
}

function compact(value: string | undefined, max = 500): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

function firstLine(value: string | undefined): string | null {
  const normalized = compact(value, 180);
  return normalized?.split('\n').find(Boolean) || null;
}

function inferStuckPoint(verdict: ExecutionVerdict, failedTestCase: FailureSnapshot | null): string {
  const errorLine = firstLine(failedTestCase?.error);
  const actual = compact(failedTestCase?.actualOutput, 240);
  const expected = compact(failedTestCase?.expectedOutput, 240);

  if (verdict === 'Compilation Error') {
    return errorLine
      ? `Compiler stopped at: ${errorLine}`
      : 'The submitted code did not compile, so the first revision step is checking syntax, imports, and the required entry point.';
  }

  if (verdict === 'Runtime Error') {
    return errorLine
      ? `Runtime failed with: ${errorLine}`
      : 'The code crashed while running a concrete input, usually from an unchecked boundary state or invalid operation.';
  }

  if (verdict === 'TLE' || verdict === 'Time Limit Exceeded') {
    return 'The approach did not finish in time, so revisit the repeated work and the tightest invariant for the pattern.';
  }

  if (verdict === 'MLE' || verdict === 'Memory Limit Exceeded') {
    return 'The approach used too much memory, so revisit duplicated structures and whether the state can be compressed.';
  }

  if (!actual) {
    return 'The code produced no output for a case that expected a value.';
  }

  if (expected && actual.toLowerCase() !== expected.toLowerCase() && actual.trim().toLowerCase() === expected.trim().toLowerCase()) {
    return 'The value was right after normalization, so the likely weak spot is output formatting.';
  }

  const actualNumber = actual.match(/^-?\d+(?:\.\d+)?$/)?.[0];
  const expectedNumber = expected?.match(/^-?\d+(?:\.\d+)?$/)?.[0];
  if (actualNumber && expectedNumber) {
    const diff = Number(actualNumber) - Number(expectedNumber);
    if (Number.isFinite(diff) && Math.abs(diff) === 1) {
      return 'The answer was off by one on the failing case, so re-check loop bounds and inclusive/exclusive decisions.';
    }
  }

  return 'The first failing case disagreed with the expected output, so re-check the invariant against that exact input before changing the whole solution.';
}

export function buildRevisionLearning(
  verdict: ExecutionVerdict,
  topicTags: string,
  failedTestCase: FailureSnapshot | null,
): RevisionLearning {
  let parsedTopics: string[] = [];
  try {
    parsedTopics = JSON.parse(topicTags || '[]');
  } catch {
    parsedTopics = [];
  }

  const keyTakeawayByVerdict: Partial<Record<ExecutionVerdict, string>> = {
    'Compilation Error': 'Read the compiler error first. Check syntax, imports, types, and the required function signature before changing the algorithm.',
    'Runtime Error': 'Trace the failing input and guard empty, null, and boundary states before indexing, dereferencing, or dividing.',
    TLE: 'Re-check the complexity of the approach. Look for repeated work that can be replaced by a hash map, two pointers, sorting, or a tighter invariant.',
    'Time Limit Exceeded': 'Re-check the complexity of the approach. Look for repeated work that can be replaced by a hash map, two pointers, sorting, or a tighter invariant.',
    'Wrong Answer': 'Compare expected and actual output on the first failing case, then re-check the invariant, output format, and edge cases.',
    MLE: 'Re-check the memory footprint and whether the full input or duplicated structures can be streamed, reused, or compressed.',
    'Memory Limit Exceeded': 'Re-check the memory footprint and whether the full input or duplicated structures can be streamed, reused, or compressed.',
  };

  const stuckPoint = inferStuckPoint(verdict, failedTestCase);

  return {
    failureType: verdict,
    pattern: parsedTopics[0] || 'General DSA',
    keyTakeaway: `${keyTakeawayByVerdict[verdict] || 'Use the failing test case to isolate the broken assumption, then re-solve the problem from its core invariant.'} Latest stuck point: ${stuckPoint}`,
    error: compact(failedTestCase?.error),
    stuckPoint,
  };
}

export function snapshotForRevision(failedTestCase: FailureSnapshot | null) {
  return {
    lastError: compact(failedTestCase?.error),
    lastFailedInput: compact(failedTestCase?.input, 1000),
    lastExpectedOutput: compact(failedTestCase?.expectedOutput, 1000),
    lastActualOutput: compact(failedTestCase?.actualOutput, 1000),
  };
}

export async function learnFromFailedAttempt({
  prisma,
  userId,
  problem,
  verdict,
  failedTestCase,
}: {
  prisma: PrismaClient;
  userId: string;
  problem: { id: string; topicTags: string };
  verdict: ExecutionVerdict;
  failedTestCase: FailureSnapshot | null;
}): Promise<RevisionDeckLearningResult | null> {
  if (verdict === 'Accepted' || !failedTestCase) return null;

  const revision = buildRevisionLearning(verdict, problem.topicTags, failedTestCase);
  const snapshot = snapshotForRevision(failedTestCase);
  const learnedCard = await prisma.revisionCard.upsert({
    where: {
      userId_problemId: {
        userId,
        problemId: problem.id,
      },
    },
    create: {
      userId,
      problemId: problem.id,
      pattern: revision.pattern,
      keyTakeaway: revision.keyTakeaway,
      interval: 1,
      repetitions: 0,
      dueDate: new Date(),
      failureCount: 1,
      lastFailureType: revision.failureType,
      ...snapshot,
      learnedAt: new Date(),
    },
    update: {
      pattern: revision.pattern,
      keyTakeaway: revision.keyTakeaway,
      interval: 1,
      repetitions: 0,
      dueDate: new Date(),
      failureCount: { increment: 1 },
      lastFailureType: revision.failureType,
      ...snapshot,
      learnedAt: new Date(),
    },
  });

  return {
    failureCount: learnedCard.failureCount,
    failureType: revision.failureType,
    pattern: revision.pattern,
  };
}
