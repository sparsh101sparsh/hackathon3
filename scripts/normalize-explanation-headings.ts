import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const HEADING_PATTERN = /(?<!\*)Explanation:/g;
const catalogPath = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');

function normalize(value: string | null | undefined): string | null | undefined {
  return typeof value === 'string' ? value.replace(HEADING_PATTERN, '**Explanation:**') : value;
}

function normalizeObject(value: unknown): unknown {
  if (typeof value === 'string') return normalize(value);
  if (Array.isArray(value)) return value.map(normalizeObject);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeObject(item)]));
  }
  return value;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const normalizedCatalog = normalizeObject(catalog);
  fs.writeFileSync(catalogPath, `${JSON.stringify(normalizedCatalog, null, 2)}\n`, 'utf8');

  const problems = await prisma.problem.findMany({ include: { testCases: true } });
  const operations = [];
  let problemCount = 0;
  let testCaseCount = 0;
  for (const problem of problems) {
    const nextProblem = {
      statement: normalize(problem.statement)!,
      inputFormat: normalize(problem.inputFormat)!,
      outputFormat: normalize(problem.outputFormat)!,
      constraints: normalize(problem.constraints)!,
      editorial: normalize(problem.editorial)!,
    };
    if (JSON.stringify(nextProblem) !== JSON.stringify({
      statement: problem.statement,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      editorial: problem.editorial,
    })) {
      operations.push(prisma.problem.update({ where: { id: problem.id }, data: nextProblem }));
      problemCount++;
    }
    for (const testCase of problem.testCases) {
      const input = normalize(testCase.input)!;
      const expectedOutput = normalize(testCase.expectedOutput)!;
      const explanation = normalize(testCase.explanation);
      if (input !== testCase.input || expectedOutput !== testCase.expectedOutput || explanation !== testCase.explanation) {
        operations.push(prisma.testCase.update({ where: { id: testCase.id }, data: { input, expectedOutput, explanation } }));
        testCaseCount++;
      }
    }
  }

  await prisma.$transaction(operations);
  console.log(`Normalized ${problemCount} problem records and ${testCaseCount} test-case explanations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
