import { prisma } from '../lib/prisma';

async function checkProblems() {
  const total = await prisma.problem.count();
  console.log(`Total Problems in Database: ${total}`);

  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      title: true,
      statement: true,
      inputFormat: true,
      outputFormat: true,
      constraints: true,
      testCases: { select: { input: true, expectedOutput: true, isSample: true } },
    },
    take: 10,
  });

  for (const p of problems) {
    console.log(`\n========================================`);
    console.log(`Title: ${p.title}`);
    console.log(`Statement length: ${p.statement.length}`);
    console.log(`Statement preview:\n${p.statement.substring(0, 300)}`);
    console.log(`Input Format: ${p.inputFormat}`);
    console.log(`Output Format: ${p.outputFormat}`);
    console.log(`Constraints: ${p.constraints}`);
    console.log(`Sample testcases count: ${p.testCases.length}`);
    if (p.testCases.length > 0) {
      console.log(`TC #1 Input: ${p.testCases[0].input.substring(0, 100)}`);
      console.log(`TC #1 Expected: ${p.testCases[0].expectedOutput.substring(0, 100)}`);
    }
  }
}

checkProblems().catch(console.error).finally(() => prisma.$disconnect());
