import { buildRevisionLearning, learnFromFailedAttempt, snapshotForRevision } from '../lib/revisionLearning';
import { isRevisionQuality, nextRevisionInterval } from '../lib/revisionSchedule';
import { ExecutionVerdict } from '../lib/types';

const failedCase = {
  input: '[1, 2, 3]',
  expectedOutput: '6',
  actualOutput: '5',
  error: 'assertion mismatch',
};

const verdicts: ExecutionVerdict[] = [
  'Compilation Error',
  'Runtime Error',
  'Wrong Answer',
  'TLE',
  'MLE',
];

for (const verdict of verdicts) {
  const learning = buildRevisionLearning(verdict, '["Arrays & Hashing"]', failedCase);
  if (
    learning.failureType !== verdict ||
    learning.pattern !== 'Arrays & Hashing' ||
    !learning.keyTakeaway ||
    !learning.error ||
    !learning.stuckPoint ||
    !learning.keyTakeaway.includes('Latest stuck point:')
  ) {
    throw new Error(`Revision learning did not produce a complete card for ${verdict}.`);
  }
}

const offByOneLearning = buildRevisionLearning('Wrong Answer', '["Arrays"]', {
  input: '5',
  expectedOutput: '10',
  actualOutput: '9',
});
if (!offByOneLearning.stuckPoint.toLowerCase().includes('off by one')) {
  throw new Error('Revision learning did not detect an off-by-one stuck point.');
}

if (
  !isRevisionQuality('HARD') ||
  !isRevisionQuality('GOOD') ||
  !isRevisionQuality('EASY') ||
  isRevisionQuality('MEDIUM') ||
  nextRevisionInterval(1, 'HARD') !== 1 ||
  nextRevisionInterval(1, 'GOOD') !== 2 ||
  nextRevisionInterval(1, 'EASY') !== 4 ||
  nextRevisionInterval(0, 'GOOD') !== 2
) {
  throw new Error('Revision scheduling quality guard or interval math drifted.');
}

const snapshot = snapshotForRevision(failedCase);
if (snapshot.lastFailedInput !== failedCase.input || snapshot.lastExpectedOutput !== failedCase.expectedOutput || snapshot.lastActualOutput !== failedCase.actualOutput || snapshot.lastError !== failedCase.error) {
  throw new Error('Revision failure snapshot did not preserve the failing case details.');
}

async function main() {
  let upsertPayload: unknown = null;
  const fakePrisma = {
    revisionCard: {
      upsert: async (payload: unknown) => {
        upsertPayload = payload;
        return { failureCount: 3 };
      },
    },
  };

  const learned = await learnFromFailedAttempt({
    prisma: fakePrisma as never,
    userId: 'user-1',
    problem: { id: 'problem-1', topicTags: '["Dynamic Programming"]' },
    verdict: 'Wrong Answer',
    failedTestCase: failedCase,
  });

  if (!learned || learned.failureCount !== 3 || learned.failureType !== 'Wrong Answer' || learned.pattern !== 'Dynamic Programming') {
    throw new Error('Revision deck learning did not return the learned card summary.');
  }

  const payload = upsertPayload as {
    where?: { userId_problemId?: { userId?: string; problemId?: string } };
    update?: { dueDate?: Date; failureCount?: { increment?: number }; lastFailedInput?: string | null; keyTakeaway?: string };
  };
  if (
    payload?.where?.userId_problemId?.userId !== 'user-1' ||
    payload?.where?.userId_problemId?.problemId !== 'problem-1' ||
    payload?.update?.failureCount?.increment !== 1 ||
    !(payload?.update?.dueDate instanceof Date) ||
    payload?.update?.lastFailedInput !== failedCase.input ||
    !String(payload?.update?.keyTakeaway || '').includes('Latest stuck point:')
  ) {
    throw new Error('Revision deck learning did not upsert the due card with failure details.');
  }

  upsertPayload = null;
  await learnFromFailedAttempt({
    prisma: fakePrisma as never,
    userId: 'user-1',
    problem: { id: 'hidden-problem', topicTags: '["Binary Search"]' },
    verdict: 'Wrong Answer',
    failedTestCase: {
      input: '[hidden test case]',
      expectedOutput: '[hidden test case]',
      actualOutput: 'false',
    },
  });

  const hiddenPayload = upsertPayload as {
    create?: { lastFailedInput?: string | null; lastExpectedOutput?: string | null };
    update?: { lastFailedInput?: string | null; lastExpectedOutput?: string | null };
  };
  if (
    hiddenPayload?.create?.lastFailedInput !== '[hidden test case]' ||
    hiddenPayload?.create?.lastExpectedOutput !== '[hidden test case]' ||
    hiddenPayload?.update?.lastFailedInput !== '[hidden test case]' ||
    hiddenPayload?.update?.lastExpectedOutput !== '[hidden test case]'
  ) {
    throw new Error('Revision learning did not preserve hidden-test masking.');
  }

  console.log(`Revision learning verification: ${verdicts.length} failure classes, snapshots, and deck upsert passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
