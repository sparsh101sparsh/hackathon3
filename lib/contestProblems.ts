import { prisma } from '@/lib/prisma';

/** Ensures legacy/fallback contests have real problem links instead of UI-only placeholders. */
export async function ensureContestProblemLinks(contestId: string): Promise<void> {
  const existingCount = await prisma.contestProblem.count({ where: { contestId } });
  if (existingCount > 0) return;

  const problems = await prisma.problem.findMany({
    orderBy: { createdAt: 'asc' },
    take: 4,
    select: { id: true },
  });

  if (problems.length === 0) return;

  const currentCount = await prisma.contestProblem.count({ where: { contestId } });
  if (currentCount > 0) return;

  await prisma.contestProblem.createMany({
    data: problems.map((problem, index) => ({
      contestId,
      problemId: problem.id,
      points: [100, 250, 500, 1000][index] || 100,
      order: index + 1,
    })),
  });
}
