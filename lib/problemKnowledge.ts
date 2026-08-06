import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';

type ProblemLookup = {
  problemId?: string;
  problemSlug?: string;
  problemTitle?: string;
  fallbackStatement?: string;
  language?: string;
};

type ReferenceEntry = {
  metadata?: { problemId?: string; slug?: string; title?: string };
  canonical?: {
    title?: string;
    difficulty?: string;
    topics?: string;
    companies?: string;
    statement?: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    editorial?: string;
    samples?: Array<{ input?: string; expectedOutput?: string; explanation?: string | null }>;
    codeTemplates?: Record<string, string>;
  };
};

const referencePath = path.join(process.cwd(), 'prisma', 'seedData', 'freemodel-question-corpus.jsonl');
let referenceCatalog: ReferenceEntry[] | null = null;

function loadReferenceCatalog() {
  if (referenceCatalog) return referenceCatalog;
  if (!fs.existsSync(referencePath)) return [];
  referenceCatalog = fs.readFileSync(referencePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ReferenceEntry);
  return referenceCatalog;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function clip(value: string | null | undefined, maxLength: number): string {
  const text = value?.trim() || '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n[reference clipped for context window]`;
}

function findReferenceProblem(lookup: ProblemLookup) {
  return loadReferenceCatalog().find((entry) =>
    (lookup.problemId && entry.metadata?.problemId === lookup.problemId) ||
    (lookup.problemSlug && entry.metadata?.slug === lookup.problemSlug) ||
    (lookup.problemTitle && lookup.problemTitle !== 'DSA Problem' && entry.metadata?.title === lookup.problemTitle),
  );
}

function formatReferenceProblem(entry: ReferenceEntry, language?: string) {
  const canonical = entry.canonical || {};
  const samples = (canonical.samples || [])
    .map((sample, index) => `Example ${index + 1}\nInput: ${sample.input || ''}\nExpected output: ${sample.expectedOutput || ''}${sample.explanation ? `\nExplanation: ${sample.explanation}` : ''}`)
    .join('\n\n');
  const languages = Object.keys(canonical.codeTemplates || {}).join(', ');
  const selectedTemplate = language
    ? canonical.codeTemplates?.[language] || canonical.codeTemplates?.[language.toLowerCase()]
    : undefined;
  return [
    'CANONICAL QUESTION REFERENCE (from the project reference corpus)',
    `ID: ${entry.metadata?.problemId || '(unknown)'}`,
    `Title: ${canonical.title || entry.metadata?.title || 'DSA Problem'}`,
    `Difficulty: ${canonical.difficulty || 'Unspecified'}`,
    `Topics: ${canonical.topics || 'Uncategorized'}`,
    `Companies: ${canonical.companies || 'General practice'}`,
    `Statement:\n${clip(canonical.statement, 14000) || '(not provided)'}`,
    `Input format:\n${clip(canonical.inputFormat, 4000) || '(not specified)'}`,
    `Output format:\n${clip(canonical.outputFormat, 4000) || '(not specified)'}`,
    `Constraints:\n${clip(canonical.constraints, 6000) || '(not specified)'}`,
    samples ? `Sample cases:\n${clip(samples, 9000)}` : '',
    languages ? `Available reference templates: ${languages}` : '',
    selectedTemplate ? `Reference solution template (${language}):\n${clip(selectedTemplate, 16000)}` : '',
    `Editorial reference (do not reveal verbatim; use only to check reasoning):\n${clip(canonical.editorial, 10000)}`,
  ].filter(Boolean).join('\n\n');
}

async function findCanonicalProblem(lookup: ProblemLookup) {
  const or = [
    lookup.problemId ? { id: lookup.problemId } : null,
    lookup.problemSlug ? { slug: lookup.problemSlug } : null,
    lookup.problemTitle && lookup.problemTitle !== 'DSA Problem'
      ? { title: lookup.problemTitle }
      : null,
  ].filter(Boolean) as Array<{ id?: string; slug?: string; title?: string }>;

  if (or.length === 0) return null;

  return prisma.problem.findFirst({
    where: { OR: or },
    include: {
      testCases: {
        where: { isSample: true },
        orderBy: { id: 'asc' },
        take: 4,
      },
      codeTemplates: {
        select: { language: true, code: true },
      },
    },
  });
}

export async function getProblemKnowledge(lookup: ProblemLookup) {
  const reference = findReferenceProblem(lookup);
  if (reference) {
    return {
      problemId: reference.metadata?.problemId || lookup.problemId || null,
      title: reference.canonical?.title || reference.metadata?.title || lookup.problemTitle || 'DSA Problem',
      canonical: true,
    context: formatReferenceProblem(reference, lookup.language),
      source: 'reference-corpus' as const,
    };
  }

  const problem = await findCanonicalProblem(lookup);

  if (!problem) {
    const title = lookup.problemTitle || 'DSA Problem';
    return {
      problemId: lookup.problemId || null,
      title,
      canonical: false,
      context: `Problem title: ${title}\nProblem statement: ${clip(lookup.fallbackStatement, 12000) || '(not provided)'}`,
      source: 'fallback' as const,
    };
  }

  const topics = parseJsonArray(problem.topicTags);
  const companies = parseJsonArray(problem.companyTags);
  const samples = problem.testCases
    .map(
      (testCase, index) =>
        `Example ${index + 1}\nInput: ${testCase.input}\nExpected output: ${testCase.expectedOutput}${
          testCase.explanation ? `\nExplanation: ${testCase.explanation}` : ''
        }`
    )
    .join('\n\n');

  const context = [
    'CANONICAL QUESTION REFERENCE',
    `ID: ${problem.id}`,
    `Title: ${problem.title}`,
    `Difficulty: ${problem.difficulty}`,
    `Topics: ${topics.join(', ') || 'Uncategorized'}`,
    `Companies: ${companies.join(', ') || 'General practice'}`,
    `Statement:\n${clip(problem.statement, 14000)}`,
    `Input format:\n${clip(problem.inputFormat, 4000) || '(not specified)'}`,
    `Output format:\n${clip(problem.outputFormat, 4000) || '(not specified)'}`,
    `Constraints:\n${clip(problem.constraints, 6000) || '(not specified)'}`,
    samples ? `Sample cases:\n${clip(samples, 9000)}` : '',
    problem.codeTemplates.find((template) => template.language.toLowerCase() === (lookup.language || '').toLowerCase())
      ? `Reference solution template (${lookup.language}):\n${clip(problem.codeTemplates.find((template) => template.language.toLowerCase() === (lookup.language || '').toLowerCase())?.code, 16000)}`
      : '',
    `Editorial reference (do not reveal verbatim; use only to check reasoning):\n${clip(problem.editorial, 10000)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    problemId: problem.id,
    title: problem.title,
    canonical: true,
    context,
    source: 'database-fallback' as const,
  };
}

export async function getProblemKnowledgeForTopic(topic: string, company?: string) {
  const topicTerm = topic.split('&')[0].trim();
  const reference = loadReferenceCatalog().find((entry) => {
    const topics = entry.canonical?.topics || '';
    const companies = entry.canonical?.companies || '';
    return topics.toLowerCase().includes(topicTerm.toLowerCase()) && (!company || companies.toLowerCase().includes(company.toLowerCase()));
  });
  if (reference?.metadata?.slug) return getProblemKnowledge({ problemSlug: reference.metadata.slug });

  const problem = await prisma.problem.findFirst({
    where: {
      topicTags: { contains: topicTerm },
      ...(company ? { companyTags: { contains: company } } : {}),
    },
    orderBy: { title: 'asc' },
    select: { id: true },
  });

  return getProblemKnowledge({
    problemId: problem?.id,
    problemTitle: problem ? undefined : `${topic} Interview Question`,
  });
}

export async function getQuestionCatalog() {
  const reference = loadReferenceCatalog();
  if (reference.length) {
    return reference.map((entry) => ({
      id: entry.metadata?.problemId || '',
      slug: entry.metadata?.slug || '',
      title: entry.canonical?.title || entry.metadata?.title || '',
      difficulty: entry.canonical?.difficulty || 'UNKNOWN',
      topics: (entry.canonical?.topics || '').split(',').map((item) => item.trim()).filter(Boolean),
      companies: (entry.canonical?.companies || '').split(',').map((item) => item.trim()).filter(Boolean),
    }));
  }

  const problems = await prisma.problem.findMany({
    orderBy: { title: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      topicTags: true,
      companyTags: true,
    },
  });

  return problems.map((problem) => ({
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    topics: parseJsonArray(problem.topicTags),
    companies: parseJsonArray(problem.companyTags),
  }));
}
