import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { EXPLICIT_COMPANY_MAPPINGS } from './company-mappings';

type CatalogProblem = {
  id?: string;
  frontendId?: number;
  slug: string;
  title?: string;
  statement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  difficulty?: string;
  topicTags?: string[];
  companyTags: string[];
  editorial?: string;
  timeLimit?: number;
  memoryLimit?: number;
  testCases?: Array<{ input: string; expectedOutput: string; isSample: boolean; explanation?: string | null }>;
  codeTemplates?: Record<string, string>;
};

const prisma = new PrismaClient();
const catalogPath = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');
const visualizerSupplementIds: Record<number, string> = {
  100: 'same-tree',
  200: 'number-of-islands',
  300: 'longest-increasing-subsequence',
};

async function main() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as CatalogProblem[];
  const byFrontendId = new Map(catalog.filter((item) => item.frontendId !== undefined).map((item) => [item.frontendId, item]));
  const bySlug = new Map(catalog.map((item) => [item.slug, item]));
  const companyNames = Object.keys(EXPLICIT_COMPANY_MAPPINGS);
  const companies = await prisma.company.findMany({ where: { name: { in: companyNames } } });
  const companyByName = new Map(companies.map((company) => [company.name, company]));
  const updates = new Map<string, Set<string>>();

  if (companies.length !== companyNames.length) {
    throw new Error(`Expected ${companyNames.length} target companies, found ${companies.length}`);
  }

  const missingIds = companyNames.flatMap((companyName) => EXPLICIT_COMPANY_MAPPINGS[companyName])
    .filter((frontendId, index, values) => !byFrontendId.has(frontendId) && values.indexOf(frontendId) === index);
  if (missingIds.length > 0) {
    const supplementSlugs = missingIds.map((frontendId) => visualizerSupplementIds[frontendId]).filter(Boolean);
    const supplements = await prisma.problem.findMany({
      where: { slug: { in: supplementSlugs } },
      include: { testCases: true, codeTemplates: true },
    });
    const supplementBySlug = new Map(supplements.map((problem) => [problem.slug, problem]));
    for (const frontendId of missingIds) {
      const slug = visualizerSupplementIds[frontendId];
      const problem = supplementBySlug.get(slug);
      if (!problem) throw new Error(`Database is missing visualizer supplement ${slug}`);
      const supplementalRecord: CatalogProblem = {
        id: problem.id,
        frontendId,
        slug: problem.slug,
        title: problem.title,
        statement: problem.statement,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        constraints: problem.constraints,
        difficulty: problem.difficulty,
        topicTags: JSON.parse(problem.topicTags),
        companyTags: JSON.parse(problem.companyTags),
        editorial: problem.editorial,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        testCases: problem.testCases.map(({ input, expectedOutput, isSample, explanation }) => ({ input, expectedOutput, isSample, explanation })),
        codeTemplates: Object.fromEntries(problem.codeTemplates.map((template) => [template.language, template.code])),
      };
      catalog.push(supplementalRecord);
      byFrontendId.set(frontendId, supplementalRecord);
      bySlug.set(problem.slug, supplementalRecord);
    }
  }

  // Visualizer support is part of the shipped catalog even when a problem is
  // not referenced by the company verification matrix.
  const allSupplementSlugs = Object.values(visualizerSupplementIds);
  const existingSupplements = await prisma.problem.findMany({
    where: { slug: { in: allSupplementSlugs } },
    include: { testCases: true, codeTemplates: true },
  });
  for (const problem of existingSupplements) {
    if (!bySlug.has(problem.slug)) {
      const frontendId = Number(Object.entries(visualizerSupplementIds).find(([, slug]) => slug === problem.slug)?.[0]);
      const supplementalRecord: CatalogProblem = {
        id: problem.id,
        frontendId,
        slug: problem.slug,
        title: problem.title,
        statement: problem.statement,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        constraints: problem.constraints,
        difficulty: problem.difficulty,
        topicTags: JSON.parse(problem.topicTags),
        companyTags: JSON.parse(problem.companyTags),
        editorial: problem.editorial,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        testCases: problem.testCases.map(({ input, expectedOutput, isSample, explanation }) => ({ input, expectedOutput, isSample, explanation })),
        codeTemplates: Object.fromEntries(problem.codeTemplates.map((template) => [template.language, template.code])),
      };
      catalog.push(supplementalRecord);
      byFrontendId.set(frontendId, supplementalRecord);
      bySlug.set(problem.slug, supplementalRecord);
    }
    updates.set(problem.slug, new Set(JSON.parse(problem.companyTags) as string[]));
  }

  for (const [companyName, frontendIds] of Object.entries(EXPLICIT_COMPANY_MAPPINGS)) {
    for (const frontendId of frontendIds) {
      const catalogProblem = byFrontendId.get(frontendId);
      if (!catalogProblem) throw new Error(`Catalog is missing frontendId ${frontendId}`);
      const tags = updates.get(catalogProblem.slug) || new Set(catalogProblem.companyTags);
      tags.add(companyName);
      updates.set(catalogProblem.slug, tags);
    }
  }

  let problemUpdates = 0;
  let linksCreated = 0;
  for (const [slug, tags] of updates) {
    const problem = await prisma.problem.findUnique({ where: { slug }, select: { id: true, companyTags: true } });
    if (!problem) throw new Error(`Database is missing catalog problem ${slug}`);
    const nextTags = Array.from(tags);
    const currentTags = JSON.parse(problem.companyTags) as string[];
    if (JSON.stringify(currentTags) !== JSON.stringify(nextTags)) {
      await prisma.problem.update({ where: { id: problem.id }, data: { companyTags: JSON.stringify(nextTags) } });
      problemUpdates++;
    }

    for (const companyName of nextTags) {
      const company = companyByName.get(companyName);
      if (!company) continue;
      const existing = await prisma.companyProblem.findFirst({ where: { companyId: company.id, problemId: problem.id } });
      if (!existing) {
        await prisma.companyProblem.create({ data: { companyId: company.id, problemId: problem.id, frequency: 75 } });
        linksCreated++;
      }
    }
  }

  for (const company of companies) {
    const problemCount = await prisma.companyProblem.count({ where: { companyId: company.id } });
    await prisma.company.update({ where: { id: company.id }, data: { problemCount } });
  }

  // Keep the checked-in source metadata consistent with the relational catalog.
  for (const [slug, tags] of updates) {
    const catalogProblem = bySlug.get(slug);
    if (catalogProblem) catalogProblem.companyTags = Array.from(tags);
  }
  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  console.log(`Reconciled ${updates.size} canonical company-tag records.`);
  console.log(`Updated ${problemUpdates} database problem records and created ${linksCreated} missing company links.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
