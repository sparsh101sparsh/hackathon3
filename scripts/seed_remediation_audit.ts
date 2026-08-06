import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOILERPLATE_PATTERNS = [
  /lorem ipsum/i,
  /\btbd\b/i,
  /\bfixme\b/i,
  /\btodo\b/i,
  /sample text/i,
  /insert text here/i,
  /placeholder/i,
  /\basdf\b/i,
  /foo bar baz/i,
  /\bn\/a\b/i,
  /no description/i,
  /write your statement here/i,
];

const EMPTY_CODE_FENCE_REGEX = /```[a-zA-Z0-9_-]*\s*```/g;
const UNBOLDED_EXPLANATION_REGEX = /(^|\n|\. |<p>|\s)Explanation:\s/g;

interface LeetCodeQuestion {
  id?: string;
  frontendId: number;
  title: string;
  slug: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: string;
  topicTags: string[];
  companyTags: string[];
  editorial: string;
  timeLimit: number;
  memoryLimit: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isSample: boolean;
    explanation?: string;
  }>;
  codeTemplates: Record<string, string>;
}

interface CorpusEntry {
  messages: Array<{ role: string; content: string }>;
  metadata: {
    problemId: string;
    slug: string;
    title: string;
    languages: string[];
    sampleCount: number;
  };
  canonical: {
    title: string;
    difficulty: string;
    topics: string;
    companies: string;
    statement: string;
    inputFormat: string;
    outputFormat: string;
    constraints: string;
    editorial: string;
    samples: Array<{ input: string; expectedOutput: string; explanation?: string }>;
    codeTemplates: Record<string, string>;
  };
}

async function audit() {
  const jsonPath = path.join(process.cwd(), 'prisma/seedData/leetcode400.json');
  const jsonlPath = path.join(process.cwd(), 'prisma/seedData/freemodel-question-corpus.jsonl');

  const leetcodeData: LeetCodeQuestion[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const rawCorpusLines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean);
  const dbProblems = await prisma.problem.findMany({
    include: { testCases: true, codeTemplates: true }
  });

  const leetcodeMap = new Map(leetcodeData.map(q => [q.slug, q]));
  const dbMap = new Map(dbProblems.map(p => [p.slug, p]));
  const corpusMap = new Map<string, CorpusEntry>();

interface CodeFenceError {
  source: string;
  slug: string;
  fieldName: string;
  matches: RegExpMatchArray;
}

interface UnboldedExplanationError {
  source: string;
  slug: string;
  fieldName: string;
  matches: RegExpMatchArray;
}

interface BoilerplateError {
  source: string;
  slug: string;
  fieldName: string;
  pattern: string;
}

interface DbSyncError {
  type: string;
  slug: string;
  [key: string]: unknown;
}

  const emptyCodeFenceErrors: CodeFenceError[] = [];
  const unboldedExplanationErrors: UnboldedExplanationError[] = [];
  const boilerplateErrors: BoilerplateError[] = [];
  const dbSyncErrors: DbSyncError[] = [];

  for (let i = 0; i < rawCorpusLines.length; i++) {
    try {
      const entry: CorpusEntry = JSON.parse(rawCorpusLines[i]);
      corpusMap.set(entry.metadata.slug, entry);
    } catch {}
  }

  for (const [slug, q] of leetcodeMap.entries()) {
    const cEntry = corpusMap.get(slug);
    const dbProblem = dbMap.get(slug);

    const checkText = (source: string, fieldName: string, text: string) => {
      if (!text) return;
      const fenceMatches = text.match(EMPTY_CODE_FENCE_REGEX);
      if (fenceMatches) {
        emptyCodeFenceErrors.push({ source, slug, fieldName, matches: fenceMatches });
      }

      const explanationMatches = text.match(UNBOLDED_EXPLANATION_REGEX);
      if (explanationMatches) {
        unboldedExplanationErrors.push({ source, slug, fieldName, matches: explanationMatches });
      }

      for (const pattern of BOILERPLATE_PATTERNS) {
        if (pattern.test(text)) {
          boilerplateErrors.push({ source, slug, fieldName, pattern: pattern.toString() });
        }
      }
    };

    checkText('leetcode400.json', 'statement', q.statement);
    checkText('leetcode400.json', 'inputFormat', q.inputFormat);
    checkText('leetcode400.json', 'outputFormat', q.outputFormat);
    checkText('leetcode400.json', 'constraints', q.constraints);
    checkText('leetcode400.json', 'editorial', q.editorial);
    q.testCases?.forEach((tc, idx) => checkText('leetcode400.json', `testCases[${idx}].explanation`, tc.explanation || ''));
    if (q.codeTemplates) {
      Object.entries(q.codeTemplates).forEach(([lang, code]) => checkText('leetcode400.json', `codeTemplates.${lang}`, code));
    }

    if (cEntry) {
      const c = cEntry.canonical;
      checkText('corpus.canonical', 'statement', c.statement);
      checkText('corpus.canonical', 'inputFormat', c.inputFormat);
      checkText('corpus.canonical', 'outputFormat', c.outputFormat);
      checkText('corpus.canonical', 'constraints', c.constraints);
      checkText('corpus.canonical', 'editorial', c.editorial);
      c.samples?.forEach((s, idx) => checkText('corpus.canonical', `samples[${idx}].explanation`, s.explanation || ''));
      cEntry.messages?.forEach((m, idx) => checkText('corpus.messages', `messages[${idx}].content`, m.content));
    }

    if (dbProblem) {
      checkText('PostgreSQL DB', 'statement', dbProblem.statement);
      checkText('PostgreSQL DB', 'inputFormat', dbProblem.inputFormat);
      checkText('PostgreSQL DB', 'outputFormat', dbProblem.outputFormat);
      checkText('PostgreSQL DB', 'constraints', dbProblem.constraints);
      checkText('PostgreSQL DB', 'editorial', dbProblem.editorial);
      dbProblem.testCases.forEach((tc, idx) => checkText('PostgreSQL DB', `testCases[${idx}].explanation`, tc.explanation || ''));
      dbProblem.codeTemplates.forEach((ct) => checkText('PostgreSQL DB', `codeTemplates.${ct.language}`, ct.code));
    }

    if (cEntry) {
      const c = cEntry.canonical;
      if (c.title !== q.title) dbSyncErrors.push({ type: 'Corpus Title Mismatch', slug, corpus: c.title, json: q.title });
      if (c.statement !== q.statement) dbSyncErrors.push({ type: 'Corpus Statement Mismatch', slug });
      if (c.inputFormat !== q.inputFormat) dbSyncErrors.push({ type: 'Corpus inputFormat Mismatch', slug });
      if (c.outputFormat !== q.outputFormat) dbSyncErrors.push({ type: 'Corpus outputFormat Mismatch', slug });
      if (c.constraints !== q.constraints) dbSyncErrors.push({ type: 'Corpus constraints Mismatch', slug });
      if (c.editorial !== q.editorial) dbSyncErrors.push({ type: 'Corpus editorial Mismatch', slug });
    }

    if (dbProblem) {
      if (dbProblem.title !== q.title) dbSyncErrors.push({ type: 'DB Title Mismatch', slug, db: dbProblem.title, json: q.title });
      if (dbProblem.statement !== q.statement) dbSyncErrors.push({ type: 'DB Statement Mismatch', slug });
      if (dbProblem.inputFormat !== q.inputFormat) dbSyncErrors.push({ type: 'DB inputFormat Mismatch', slug });
      if (dbProblem.outputFormat !== q.outputFormat) dbSyncErrors.push({ type: 'DB outputFormat Mismatch', slug });
      if (dbProblem.constraints !== q.constraints) dbSyncErrors.push({ type: 'DB constraints Mismatch', slug });
      if (dbProblem.difficulty !== q.difficulty) dbSyncErrors.push({ type: 'DB Difficulty Mismatch', slug, db: dbProblem.difficulty, json: q.difficulty });
      if (dbProblem.editorial !== q.editorial) dbSyncErrors.push({ type: 'DB Editorial Mismatch', slug });

      if (dbProblem.testCases.length !== q.testCases.length) {
        dbSyncErrors.push({ type: 'DB testCases count Mismatch', slug, dbCount: dbProblem.testCases.length, jsonCount: q.testCases.length });
      } else {
        for (let i = 0; i < q.testCases.length; i++) {
          const jsonTc = q.testCases[i];
          const dbTc = dbProblem.testCases[i];
          if (dbTc.input !== jsonTc.input) dbSyncErrors.push({ type: 'DB testCase Input Mismatch', slug, index: i, db: dbTc.input, json: jsonTc.input });
          if (dbTc.expectedOutput !== jsonTc.expectedOutput) dbSyncErrors.push({ type: 'DB testCase ExpectedOutput Mismatch', slug, index: i, db: dbTc.expectedOutput, json: jsonTc.expectedOutput });
          if (dbTc.isSample !== jsonTc.isSample) dbSyncErrors.push({ type: 'DB testCase isSample Mismatch', slug, index: i, db: dbTc.isSample, json: jsonTc.isSample });
          if ((dbTc.explanation || undefined) !== jsonTc.explanation) dbSyncErrors.push({ type: 'DB testCase Explanation Mismatch', slug, index: i, db: dbTc.explanation, json: jsonTc.explanation });
        }
      }

      const requiredLangs = ['python', 'cpp', 'javascript', 'java', 'go'];
      const dbTmplMap = new Map(dbProblem.codeTemplates.map(t => [t.language, t.code]));
      for (const lang of requiredLangs) {
        const jsonCode = q.codeTemplates[lang];
        const dbCode = dbTmplMap.get(lang);
        if (!dbCode) {
          dbSyncErrors.push({ type: 'DB Missing Template', slug, lang });
        } else if (dbCode !== jsonCode) {
          dbSyncErrors.push({ type: 'DB Template Mismatch', slug, lang });
        }
      }
    }
  }

  const output = {
    emptyCodeFenceErrors,
    unboldedExplanationErrors,
    boilerplateErrors,
    dbSyncErrors
  };

  fs.writeFileSync('/tmp/audit_errors.json', JSON.stringify(output, null, 2));

  console.log('Done auditing. Output saved to /tmp/audit_errors.json');
  console.log('Empty Code Fences:', emptyCodeFenceErrors.length);
  console.log('Unbolded Explanations:', unboldedExplanationErrors.length);
  console.log('Boilerplate Strings:', boilerplateErrors.length);
  console.log('DB Parity Errors:', dbSyncErrors.length);

  await prisma.$disconnect();
}

audit().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
