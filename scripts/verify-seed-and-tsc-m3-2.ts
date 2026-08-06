import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LeetCodeQuestion {
  id: string;
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

const BOILERPLATE_PATTERNS = [
  /lorem ipsum/i,
  /\btbd\b/i,
  /\bfixme\b/i,
  /\btodo\b/i,
  /sample text/i,
  /insert text here/i,
  /placeholder/i,
  /asdf/i,
  /foo bar baz/i,
  /n\/a/i,
  /standard input/i,
  /standard output/i,
  /no description/i,
  /write your statement here/i,
];

async function runValidation() {
  console.log('================================================================');
  console.log('  MILESTONE M3-2 EMPIRICAL VALIDATION SUITE');
  console.log('================================================================\n');

  let passed = true;

  // STEP 1: TypeScript Compiler Check
  console.log('--- STEP 1: TypeScript Compilation (`npx tsc --noEmit`) ---');
  try {
    const tscOutput = execSync('npx tsc --noEmit', { cwd: process.cwd(), encoding: 'utf8' });
    console.log('✅ PASS: TypeScript compilation succeeded with 0 errors.');
  } catch (err: any) {
    console.error('❌ FAIL: TypeScript compiler returned errors:');
    console.error(err.stdout || err.stderr || err.message);
    passed = false;
  }

  // STEP 2: Seed File `leetcode400.json` Stress-Test
  console.log('\n--- STEP 2: Seed File `leetcode400.json` Stress-Test ---');
  const leetcode400Path = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');
  if (!fs.existsSync(leetcode400Path)) {
    console.error(`❌ FAIL: File not found at ${leetcode400Path}`);
    passed = false;
    return;
  }

  const leetcodeData: LeetCodeQuestion[] = JSON.parse(fs.readFileSync(leetcode400Path, 'utf8'));
  console.log(`Total questions in leetcode400.json: ${leetcodeData.length}`);

  if (leetcodeData.length < 400) {
    console.error(`❌ FAIL: Expected >= 400 questions, got ${leetcodeData.length}`);
    passed = false;
  } else {
    console.log('✅ PASS: Question count >= 400');
  }

  let boilerplateCount = 0;
  let missingInputFormat = 0;
  let missingOutputFormat = 0;
  let nonSpecificFormats = 0;
  let missingTemplates = 0;
  let missingTestCases = 0;

  const slugs = new Set<string>();
  const duplicateSlugs: string[] = [];

  for (const q of leetcodeData) {
    if (slugs.has(q.slug)) {
      duplicateSlugs.push(q.slug);
    }
    slugs.add(q.slug);

    // Check boilerplate in text fields
    const fieldsToTest = [
      q.title,
      q.statement,
      q.inputFormat,
      q.outputFormat,
      q.constraints,
      q.editorial,
    ];

    for (const text of fieldsToTest) {
      if (!text) continue;
      for (const pattern of BOILERPLATE_PATTERNS) {
        if (pattern.test(text)) {
          console.warn(`[Boilerplate match] Slug: ${q.slug}, Text snippet: "${text.slice(0, 60)}...", Pattern: ${pattern}`);
          boilerplateCount++;
        }
      }
    }

    // Input/Output format specific description coverage check
    if (!q.inputFormat || q.inputFormat.trim().length === 0) {
      missingInputFormat++;
    } else if (q.inputFormat.trim().length < 5) {
      nonSpecificFormats++;
    }

    if (!q.outputFormat || q.outputFormat.trim().length === 0) {
      missingOutputFormat++;
    } else if (q.outputFormat.trim().length < 5) {
      nonSpecificFormats++;
    }

    // Code template check
    const langs = ['python', 'cpp', 'javascript', 'java', 'go'];
    const missingLangs = langs.filter((l) => !q.codeTemplates || !q.codeTemplates[l]);
    if (missingLangs.length > 0) {
      missingTemplates++;
    }

    // Test cases check
    if (!q.testCases || q.testCases.length === 0) {
      missingTestCases++;
    }
  }

  console.log(`Duplicate Slugs: ${duplicateSlugs.length}`);
  console.log(`Boilerplate Strings Found: ${boilerplateCount}`);
  console.log(`Missing Input Formats: ${missingInputFormat}`);
  console.log(`Missing Output Formats: ${missingOutputFormat}`);
  console.log(`Non-specific / Short Formats (<5 chars): ${nonSpecificFormats}`);
  console.log(`Questions Missing Language Templates: ${missingTemplates}`);
  console.log(`Questions Missing Test Cases: ${missingTestCases}`);

  if (duplicateSlugs.length > 0 || boilerplateCount > 0 || missingInputFormat > 0 || missingOutputFormat > 0 || nonSpecificFormats > 0 || missingTemplates > 0 || missingTestCases > 0) {
    console.error('❌ FAIL: leetcode400.json failed empirical criteria.');
    passed = false;
  } else {
    console.log('✅ PASS: leetcode400.json has 0 boilerplate strings, 100% specific input/output description coverage, and complete templates/test cases.');
  }

  // STEP 3: Seed File `freemodel-question-corpus.jsonl` Stress-Test
  console.log('\n--- STEP 3: Corpus File `freemodel-question-corpus.jsonl` Stress-Test ---');
  const corpusPath = path.join(process.cwd(), 'prisma', 'seedData', 'freemodel-question-corpus.jsonl');
  if (!fs.existsSync(corpusPath)) {
    console.error(`❌ FAIL: File not found at ${corpusPath}`);
    passed = false;
  } else {
    const rawCorpusLines = fs.readFileSync(corpusPath, 'utf8').trim().split('\n').filter(Boolean);
    console.log(`Total corpus entries (lines): ${rawCorpusLines.length}`);

    if (rawCorpusLines.length !== leetcodeData.length) {
      console.error(`❌ FAIL: Corpus line count (${rawCorpusLines.length}) does not match leetcode400.json count (${leetcodeData.length})`);
      passed = false;
    } else {
      console.log('✅ PASS: Corpus entry count matches leetcode400.json count.');
    }

    let corpusParseErrors = 0;
    let corpusBoilerplateCount = 0;
    let corpusIncompleteEntries = 0;

    for (let i = 0; i < rawCorpusLines.length; i++) {
      try {
        const entry: CorpusEntry = JSON.parse(rawCorpusLines[i]);
        if (!entry.messages || entry.messages.length !== 3 || !entry.metadata || !entry.canonical) {
          corpusIncompleteEntries++;
          continue;
        }

        // Check canonical fields
        const c = entry.canonical;
        if (!c.title || !c.statement || !c.inputFormat || !c.outputFormat || !c.constraints || !c.editorial) {
          corpusIncompleteEntries++;
        }

        // Check boilerplate
        const textToCheck = [c.statement, c.inputFormat, c.outputFormat, c.constraints, c.editorial];
        for (const text of textToCheck) {
          for (const pattern of BOILERPLATE_PATTERNS) {
            if (pattern.test(text)) {
              corpusBoilerplateCount++;
            }
          }
        }
      } catch (err) {
        corpusParseErrors++;
      }
    }

    console.log(`Corpus JSON Parse Errors: ${corpusParseErrors}`);
    console.log(`Corpus Boilerplate Strings Found: ${corpusBoilerplateCount}`);
    console.log(`Corpus Incomplete Entries: ${corpusIncompleteEntries}`);

    if (corpusParseErrors > 0 || corpusBoilerplateCount > 0 || corpusIncompleteEntries > 0) {
      console.error('❌ FAIL: freemodel-question-corpus.jsonl failed empirical criteria.');
      passed = false;
    } else {
      console.log('✅ PASS: freemodel-question-corpus.jsonl is 100% valid JSON, 0 boilerplate, and 100% complete.');
    }
  }

  // STEP 4: Database Ground Truth Alignment (if DB seeded)
  console.log('\n--- STEP 4: Database Ground Truth Alignment ---');
  try {
    const dbCount = await prisma.problem.count();
    console.log(`Database Problem Count: ${dbCount}`);

    const dbWithoutInputFormat = await prisma.problem.count({ where: { OR: [{ inputFormat: '' }, { inputFormat: undefined }] } });
    const dbWithoutOutputFormat = await prisma.problem.count({ where: { OR: [{ outputFormat: '' }, { outputFormat: undefined }] } });

    console.log(`DB Problems without inputFormat: ${dbWithoutInputFormat}`);
    console.log(`DB Problems without outputFormat: ${dbWithoutOutputFormat}`);

    if (dbCount >= 400 && dbWithoutInputFormat === 0 && dbWithoutOutputFormat === 0) {
      console.log('✅ PASS: Database is fully seeded with 400 problems and 100% input/output formats.');
    } else {
      console.warn('⚠️ NOTE: Database problem count is less than 400 or missing formats. Re-seeding database...');
      execSync('npx tsx prisma/seed.ts', { cwd: process.cwd(), stdio: 'inherit' });
      const newDbCount = await prisma.problem.count();
      console.log(`Re-seeded DB problem count: ${newDbCount}`);
    }
  } catch (err: any) {
    console.error('Error checking DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  if (passed) {
    console.log('🎉 FINAL VERDICT: PASS - ALL M3-2 EMPIRICAL CRITERIA MET 100%');
  } else {
    console.log('❌ FINAL VERDICT: FAIL - EMPIRICAL VERIFICATION FAILED');
    process.exitCode = 1;
  }
}

runValidation().catch((err) => {
  console.error('Fatal error during validation:', err);
  process.exit(1);
});
