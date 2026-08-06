import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/** Rebuilds progress from distinct accepted problems so duplicate submissions cannot inflate it. */
export async function syncAcceptedProgress(userId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const acceptedSubmissions = await tx.submission.findMany({
          where: { userId, status: 'Accepted' },
          distinct: ['problemId'],
          select: { problem: { select: { difficulty: true } } },
        });

        const counts = acceptedSubmissions.reduce(
          (result, submission) => {
            if (submission.problem.difficulty === 'EASY') result.solvedEasy += 1;
            if (submission.problem.difficulty === 'MEDIUM') result.solvedMedium += 1;
            if (submission.problem.difficulty === 'HARD') result.solvedHard += 1;
            return result;
          },
          { solvedEasy: 0, solvedMedium: 0, solvedHard: 0 },
        );

        await tx.userProgress.upsert({
          where: { userId },
          create: { userId, ...counts, streak: 1, lastActiveDate: new Date() },
          update: { ...counts, lastActiveDate: new Date() },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error: unknown) {
      const isSerializationConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!isSerializationConflict || attempt === 2) throw error;
    }
  }
}
