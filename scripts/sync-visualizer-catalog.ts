import fs from 'node:fs';
import { prisma } from '../lib/prisma';

type CatalogEntry = {
  problemId: string;
  pattern: string;
  lessonPath: string;
  hasVisualizer: boolean;
};

async function main() {
  const catalogPath = 'public/data/visualizers.json';
  const catalog = Object.values(JSON.parse(fs.readFileSync(catalogPath, 'utf8'))) as CatalogEntry[];
  const slugs = catalog.map((entry) => entry.lessonPath.split('/').filter(Boolean).pop()).filter(Boolean) as string[];
  const problems = await prisma.problem.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const bySlug = new Map(problems.map((problem) => [problem.slug, problem.id]));
  const missing = slugs.filter((slug) => !bySlug.has(slug));

  if (missing.length > 0) {
    throw new Error(`Visualizer slugs missing from database: ${missing.join(', ')}`);
  }

  const synced = Object.fromEntries(catalog.map((entry) => {
    const slug = entry.lessonPath.split('/').filter(Boolean).pop() as string;
    return [bySlug.get(slug), { ...entry, problemId: bySlug.get(slug) }];
  }));
  fs.writeFileSync(catalogPath, `${JSON.stringify(synced, null, 2)}\n`);
  console.log(`Synced ${catalog.length} visualizer entries by problem slug.`);
}

main().finally(() => prisma.$disconnect());
