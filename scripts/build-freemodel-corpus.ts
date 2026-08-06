import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(', ') : '';
  } catch {
    return '';
  }
}

async function main() {
  const problems = await prisma.problem.findMany({
    orderBy: { title: 'asc' },
    include: {
      testCases: {
        where: { isSample: true },
        orderBy: { id: 'asc' },
        take: 4,
      },
      codeTemplates: {
        orderBy: { language: 'asc' },
      },
    },
  });

  const lines = problems.map((problem) => {
    const examples = problem.testCases
      .map((testCase, index) => `Example ${index + 1}: ${testCase.input} -> ${testCase.expectedOutput}`)
      .join('\n');
    const question = [
      `Canonical DSA question: ${problem.title}`,
      `Difficulty: ${problem.difficulty}`,
      `Topics: ${parseArray(problem.topicTags)}`,
      `Companies: ${parseArray(problem.companyTags)}`,
      `Statement:\n${problem.statement}`,
      `Input format:\n${problem.inputFormat}`,
      `Output format:\n${problem.outputFormat}`,
      `Constraints:\n${problem.constraints}`,
      examples ? `Sample cases:\n${examples}` : '',
    ].filter(Boolean).join('\n\n');

    const templates = Object.fromEntries(problem.codeTemplates.map((template) => [template.language, template.code]));
    const assistantAnswer = [
      problem.editorial,
      '\n\nReference implementations by language:',
      ...problem.codeTemplates.map((template) => `\n### ${template.language}\n\`\`\`\n${template.code}\n\`\`\``),
    ].join('\n');

    return JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are a precise DSA tutor. Answer using the canonical question and its editorial reasoning. Do not change the problem or invent constraints.',
        },
        { role: 'user', content: question },
        { role: 'assistant', content: assistantAnswer },
      ],
      metadata: {
        problemId: problem.id,
        slug: problem.slug,
        title: problem.title,
        languages: Object.keys(templates),
        sampleCount: problem.testCases.length,
      },
      canonical: {
        title: problem.title,
        difficulty: problem.difficulty,
        topics: parseArray(problem.topicTags),
        companies: parseArray(problem.companyTags),
        statement: problem.statement,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        constraints: problem.constraints,
        editorial: problem.editorial,
        samples: problem.testCases.map((testCase) => ({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          explanation: testCase.explanation,
        })),
        codeTemplates: templates,
      },
    });
  });

  const outputPath = path.join(process.cwd(), 'prisma', 'seedData', 'freemodel-question-corpus.jsonl');
  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`wrote ${lines.length} training examples to ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
