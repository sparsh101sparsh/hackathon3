import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { getProblemKnowledge } from '../lib/problemKnowledge';

type SourceQuestion = {
  slug: string;
  statement: string;
  editorial: string;
  codeTemplates: Record<string, string>;
  testCases: Array<unknown>;
};

async function main() {
  const sourcePath = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as SourceQuestion[];
  const corpusPath = path.join(process.cwd(), 'prisma', 'seedData', 'freemodel-question-corpus.jsonl');
  const corpus = fs.existsSync(corpusPath)
    ? fs.readFileSync(corpusPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : [];
  const prisma = new PrismaClient();

  try {
    const problems = await prisma.problem.findMany({
      select: {
        slug: true,
        statement: true,
        editorial: true,
        codeTemplates: { select: { language: true } },
        testCases: { select: { id: true } },
      },
    });

    const dbBySlug = new Map(problems.map((problem) => [problem.slug, problem]));
    const missing = source.filter((question) => !dbBySlug.has(question.slug)).map((q) => q.slug);
    const incomplete = source
      .map((question) => ({ source: question, db: dbBySlug.get(question.slug) }))
      .filter(({ source: question, db }) =>
        !db ||
        !db.statement.trim() ||
        !db.editorial.trim() ||
        db.testCases.length === 0 ||
        db.codeTemplates.length < 5 ||
        Object.keys(question.codeTemplates).length < 5
      )
      .map(({ source: question }) => question.slug);

    let groundedLookups = 0;
    for (const question of source) {
      const knowledge = await getProblemKnowledge({ problemSlug: question.slug });
      if (!knowledge.canonical || knowledge.problemId === null) {
        incomplete.push(question.slug);
      } else {
        groundedLookups++;
      }
    }

    console.log(`source questions: ${source.length}`);
    console.log(`database questions: ${problems.length}`);
    console.log(`missing canonical questions: ${missing.length}`);
    console.log(`incomplete grounded questions: ${incomplete.length}`);
    console.log(`canonical helper lookups: ${groundedLookups}`);
    console.log(`fine-tuning corpus examples: ${corpus.length}`);

    const corpusSlugs = new Set(corpus.map((entry) => entry.metadata?.slug));
    const missingCorpusExamples = source.filter((question) => !corpusSlugs.has(question.slug));

    if (missing.length || incomplete.length || problems.length !== source.length || corpus.length !== source.length || missingCorpusExamples.length) {
      if (missing.length) console.error(`missing: ${missing.slice(0, 20).join(', ')}`);
      if (incomplete.length) console.error(`incomplete: ${incomplete.slice(0, 20).join(', ')}`);
      if (missingCorpusExamples.length) console.error(`missing corpus examples: ${missingCorpusExamples.slice(0, 20).map((q) => q.slug).join(', ')}`);
      process.exitCode = 1;
      return;
    }

    console.log('Question coverage verified: every canonical question has statement, editorial, samples, and five language templates.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
