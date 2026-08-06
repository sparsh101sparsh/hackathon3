import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { FREEMODEL_API_KEY, FREEMODEL_BASE_URL, MODELS } from '../lib/freemodel';

type GeneratedKnowledge = {
  slug: string;
  problemId: string;
  title: string;
  model: string;
  generatedAt: string;
  knowledge: unknown;
};

const outputPath = path.join(process.cwd(), 'prisma', 'seedData', 'freemodel-generated-knowledge.jsonl');
const concurrency = Number(process.argv.find((arg) => arg.startsWith('--concurrency='))?.split('=')[1] || 3);
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 0);

function parseJson(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean);
}

async function generate(problem: {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  statement: string;
  constraints: string;
  editorial: string;
}) {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FREEMODEL_API_KEY}`,
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: MODELS.FAST,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: 'You are building a canonical DSA knowledge cache. Return only valid JSON with keys summary, pattern, algorithm, pitfalls, timeComplexity, spaceComplexity, hint1, hint2, hint3. Never change the problem statement or invent constraints. Keep hints spoiler-controlled.',
        },
        {
          role: 'user',
          content: [
            `Question: ${problem.title}`,
            `Difficulty: ${problem.difficulty}`,
            `Statement:\n${problem.statement}`,
            `Constraints:\n${problem.constraints}`,
            `Editorial reference:\n${problem.editorial}`,
          ].join('\n\n'),
        },
      ],
    }),
  } as const;
  let response: Response | undefined;
  let lastError = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    response = await fetch(`${FREEMODEL_BASE_URL}/chat/completions`, request);
    if (response.ok) break;
    lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
    if (response.status < 429 && response.status < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
  }
  if (!response?.ok) throw new Error(lastError || 'FreeModel request failed');
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('FreeModel returned an empty response');
  return parseJson(content);
}

async function main() {
  if (!FREEMODEL_API_KEY) throw new Error('FREEMODEL_API_KEY is not configured');

  const prisma = new PrismaClient();
  try {
    const problems = await prisma.problem.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, slug: true, title: true, difficulty: true, statement: true, constraints: true, editorial: true },
    });
    const selected = limit > 0 ? problems.slice(0, limit) : problems;
    const existing = new Map<string, GeneratedKnowledge>();
    if (fs.existsSync(outputPath)) {
      for (const line of fs.readFileSync(outputPath, 'utf8').split('\n').filter(Boolean)) {
        const record = JSON.parse(line) as GeneratedKnowledge;
        existing.set(record.slug, record);
      }
    }

    const pending = selected.filter((problem) => !existing.has(problem.slug));
    console.log(`FreeModel knowledge generation: ${selected.length} selected, ${existing.size} cached, ${pending.length} pending`);
    if (!pending.length) return;

    const results: GeneratedKnowledge[] = [];
    let cursor = 0;
    async function worker() {
      while (cursor < pending.length) {
        const problem = pending[cursor++];
        try {
          const knowledge = await generate(problem);
          const record = { slug: problem.slug, problemId: problem.id, title: problem.title, model: MODELS.FAST, generatedAt: new Date().toISOString(), knowledge };
          results.push(record);
          existing.set(record.slug, record);
          fs.appendFileSync(outputPath, `${JSON.stringify(record)}\n`, 'utf8');
          console.log(`[${existing.size}/${selected.length}] ${problem.title}`);
        } catch (error) {
          console.error(`FAILED ${problem.slug}: ${error instanceof Error ? error.message : error}`);
        }
      }
    }

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
    const ordered = [...existing.values()].filter((record) => selected.some((problem) => problem.slug === record.slug)).sort((a, b) => a.slug.localeCompare(b.slug));
    fs.writeFileSync(outputPath, `${ordered.map((record) => JSON.stringify(record)).join('\n')}\n`, 'utf8');
    console.log(`wrote ${results.length} new records; ${ordered.length}/${selected.length} selected questions now have generated knowledge`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
