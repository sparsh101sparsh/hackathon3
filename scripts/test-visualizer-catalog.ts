import fs from 'node:fs';
import { prisma } from '../lib/prisma';

type Entry = {
  problemId: string;
  lessonPath: string;
  hasVisualizer: boolean;
};

type ProblemRef = {
  id: string;
  slug: string;
};

async function loadProblemRefs(ids: string[]): Promise<ProblemRef[]> {
  try {
    return await prisma.problem.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true },
    });
  } catch (error) {
    console.warn('Visualizer catalog DB lookup failed; falling back to prisma/seedData/leetcode400.json.');
    const seedProblems = JSON.parse(fs.readFileSync('prisma/seedData/leetcode400.json', 'utf8')) as ProblemRef[];
    const wanted = new Set(ids);
    return seedProblems.filter((problem) => wanted.has(problem.id)).map(({ id, slug }) => ({ id, slug }));
  }
}

async function main() {
  const entries = Object.values(JSON.parse(fs.readFileSync('public/data/visualizers.json', 'utf8'))) as Entry[];
  const ids = entries.map((entry) => entry.problemId);
  const problems = await loadProblemRefs(ids);
  const byId = new Map(problems.map((problem) => [problem.id, problem.slug]));
  const failures = entries.flatMap((entry) => {
    const expectedSlug = entry.lessonPath.split('/').filter(Boolean).pop();
    const actualSlug = byId.get(entry.problemId);
    return actualSlug && actualSlug === expectedSlug && entry.hasVisualizer
      ? []
      : [`${entry.problemId}: expected ${expectedSlug}, found ${actualSlug || 'missing'}`];
  });

  if (failures.length > 0) {
    throw new Error(`Visualizer catalog integrity failed:\n${failures.join('\n')}`);
  }

  console.log(`Visualizer catalog integrity: ${entries.length} entries resolve to canonical problem records.`);
}

main().finally(() => prisma.$disconnect());
