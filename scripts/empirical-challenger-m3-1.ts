import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// Comprehensive list of generic boilerplate strings/patterns
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
  /standard input/i,
  /standard output/i,
  /no description/i,
  /write your statement here/i,
  /input format specified in the problem statement/i,
  /output format specified in the problem statement/i,
  /see problem statement/i,
  /refer to problem description/i,
  /enter input here/i,
  /enter output here/i,
];

const GENERIC_OUTPUT_FALLBACK_PATTERNS = [
  "Return the calculated result value matching problem specifications.",
  "return the calculated result value matching problem specifications.",
];

interface ProblemRecord {
  source: string;
  id?: string;
  slug: string;
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  topicTags: string[];
}

async function runEmpiricalStressTest() {
  console.log('================================================================');
  console.log('  M3-1 REMEDIATION EMPIRICAL CHALLENGER STRESS-TEST SUITE');
  console.log('================================================================\n');

  let overallPassed = true;

  // ----------------------------------------------------------------
  // 1. TypeScript Compiler Check
  // ----------------------------------------------------------------
  console.log('--- TEST 1: TypeScript Compiler Check (`npx tsc --noEmit`) ---');
  try {
    const tscOutput = execSync('npx tsc --noEmit', { cwd: process.cwd(), encoding: 'utf8' });
    console.log('✅ PASS: `npx tsc --noEmit` executed cleanly with 0 errors.\n');
  } catch (err: any) {
    console.error('❌ FAIL: TypeScript compiler returned errors:');
    console.error(err.stdout || err.stderr || err.message);
    overallPassed = false;
  }

  // Collect all problem sources
  const problemSources: { name: string; problems: ProblemRecord[] }[] = [];

  // Source A: PostgreSQL Database
  try {
    const dbProblems = await prisma.problem.findMany();
    console.log(`Loaded ${dbProblems.length} problems from PostgreSQL database.`);
    problemSources.push({
      name: `PostgreSQL Database (table: Problem, count: ${dbProblems.length})`,
      problems: dbProblems.map((p) => {
        let tags: string[] = [];
        try {
          tags = typeof p.topicTags === 'string' ? JSON.parse(p.topicTags) : p.topicTags || [];
        } catch {
          tags = [];
        }
        return {
          source: 'Database',
          id: p.id,
          slug: p.slug,
          title: p.title,
          statement: p.statement,
          inputFormat: p.inputFormat,
          outputFormat: p.outputFormat,
          constraints: p.constraints,
          topicTags: tags,
        };
      }),
    });
  } catch (err: any) {
    console.error('❌ Error fetching problems from PostgreSQL DB:', err.message);
    overallPassed = false;
  }

  // Source B: leetcode400.json
  const l400Path = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');
  if (fs.existsSync(l400Path)) {
    const raw = fs.readFileSync(l400Path, 'utf8');
    const items = JSON.parse(raw);
    console.log(`Loaded ${items.length} problems from prisma/seedData/leetcode400.json.`);
    problemSources.push({
      name: `leetcode400.json (count: ${items.length})`,
      problems: items.map((p: any) => ({
        source: 'leetcode400.json',
        slug: p.slug,
        title: p.title,
        statement: p.statement,
        inputFormat: p.inputFormat,
        outputFormat: p.outputFormat,
        constraints: p.constraints,
        topicTags: Array.isArray(p.topicTags) ? p.topicTags : [],
      })),
    });
  }

  // Source C: freemodel-question-corpus.jsonl
  const corpusPath = path.join(process.cwd(), 'prisma', 'seedData', 'freemodel-question-corpus.jsonl');
  if (fs.existsSync(corpusPath)) {
    const lines = fs.readFileSync(corpusPath, 'utf8').trim().split('\n').filter(Boolean);
    const corpusProblems: ProblemRecord[] = [];
    lines.forEach((line, idx) => {
      try {
        const parsed = JSON.parse(line);
        const c = parsed.canonical;
        if (c) {
          let tags: string[] = [];
          if (typeof c.topics === 'string') {
            tags = c.topics.split(',').map((s: string) => s.trim());
          } else if (Array.isArray(c.topics)) {
            tags = c.topics;
          }
          corpusProblems.push({
            source: 'freemodel-question-corpus.jsonl',
            slug: parsed.metadata?.slug || `line-${idx + 1}`,
            title: c.title,
            statement: c.statement,
            inputFormat: c.inputFormat,
            outputFormat: c.outputFormat,
            constraints: c.constraints,
            topicTags: tags,
          });
        }
      } catch (e) {
        console.error(`Error parsing line ${idx + 1} of corpus:`, e);
      }
    });
    console.log(`Loaded ${corpusProblems.length} problems from prisma/seedData/freemodel-question-corpus.jsonl.`);
    problemSources.push({
      name: `freemodel-question-corpus.jsonl (count: ${corpusProblems.length})`,
      problems: corpusProblems,
    });
  }

  // Source D: problemsPart1.ts, problemsPart2.ts, problemsPart3.ts
  for (const part of ['problemsPart1', 'problemsPart2', 'problemsPart3']) {
    try {
      const partMod = require(`../prisma/seedData/${part}`);
      const partArray = partMod[part] || Object.values(partMod)[0];
      if (Array.isArray(partArray)) {
        console.log(`Loaded ${partArray.length} problems from prisma/seedData/${part}.ts.`);
        problemSources.push({
          name: `${part}.ts (count: ${partArray.length})`,
          problems: partArray.map((p: any) => ({
            source: `${part}.ts`,
            slug: p.slug,
            title: p.title,
            statement: p.statement,
            inputFormat: p.inputFormat,
            outputFormat: p.outputFormat,
            constraints: p.constraints,
            topicTags: Array.isArray(p.topicTags) ? p.topicTags : [],
          })),
        });
      }
    } catch (e: any) {
      console.warn(`Could not load ${part}.ts:`, e.message);
    }
  }

  console.log(`\nTotal Problem Data Sources Evaluated: ${problemSources.length}\n`);

  // ----------------------------------------------------------------
  // Automated Verification Checks across all sources
  // ----------------------------------------------------------------

  for (const src of problemSources) {
    console.log(`================================================================`);
    console.log(`  EVALUATING: ${src.name}`);
    console.log(`================================================================`);

    let sourcePassed = true;
    let boilerplateFailures = 0;
    let fallbackOutputFailures = 0;
    let binaryTreeMisclassifications = 0;
    let emptyFieldFailures = 0;

    const total = src.problems.length;

    for (let i = 0; i < src.problems.length; i++) {
      const p = src.problems[i];

      // Check A: Empty fields
      if (!p.statement || p.statement.trim() === '') {
        console.error(`[EMPTY FIELD] Source: ${src.name} | Slug: ${p.slug} | Field: statement is EMPTY`);
        emptyFieldFailures++;
      }
      if (!p.inputFormat || p.inputFormat.trim() === '') {
        console.error(`[EMPTY FIELD] Source: ${src.name} | Slug: ${p.slug} | Field: inputFormat is EMPTY`);
        emptyFieldFailures++;
      }
      if (!p.outputFormat || p.outputFormat.trim() === '') {
        console.error(`[EMPTY FIELD] Source: ${src.name} | Slug: ${p.slug} | Field: outputFormat is EMPTY`);
        emptyFieldFailures++;
      }
      if (!p.constraints || p.constraints.trim() === '') {
        console.error(`[EMPTY FIELD] Source: ${src.name} | Slug: ${p.slug} | Field: constraints is EMPTY`);
        emptyFieldFailures++;
      }

      // Check B: Generic Boilerplate in inputFormat / outputFormat / statement / constraints
      const fieldsToCheck = [
        { name: 'inputFormat', val: p.inputFormat },
        { name: 'outputFormat', val: p.outputFormat },
        { name: 'statement', val: p.statement },
        { name: 'constraints', val: p.constraints },
      ];

      for (const field of fieldsToCheck) {
        if (!field.val) continue;
        for (const pattern of BOILERPLATE_PATTERNS) {
          if (pattern.test(field.val)) {
            console.error(`[BOILERPLATE MATCH] Source: ${src.name} | Slug: ${p.slug} | Field: ${field.name} | Snippet: "${field.val.slice(0, 80)}" | Pattern: ${pattern}`);
            boilerplateFailures++;
          }
        }
      }

      // Check C: Generic Output Fallback Text ("Return the calculated result value matching problem specifications.")
      if (p.outputFormat) {
        const outLower = p.outputFormat.trim().toLowerCase();
        if (
          outLower.includes("return the calculated result value matching problem specifications") ||
          outLower === "return the calculated result value matching problem specifications."
        ) {
          console.error(`[GENERIC FALLBACK OUTPUT] Source: ${src.name} | Slug: ${p.slug} | outputFormat: "${p.outputFormat}"`);
          fallbackOutputFailures++;
        }
      }

      // Check D: Binary Tree Parameter Misclassifications on String or Array problems
      // Definition: inputFormat claims parameter is a Binary Tree / root pointer / TreeNode / root node
      // when the problem is a string or array/matrix/DP problem without any tree context.
      const inputFmtLower = (p.inputFormat || '').toLowerCase();
      const titleLower = (p.title || '').toLowerCase();
      const tagsLower = (p.topicTags || []).map((t) => t.toLowerCase());

      const claimsBinaryTreeInInput =
        inputFmtLower.includes('binary tree') ||
        inputFmtLower.includes('root pointer') ||
        inputFmtLower.includes('treenode') ||
        inputFmtLower.includes('root node');

      const isLegitimateTreeProblem =
        tagsLower.some((t) => t.includes('tree') || t.includes('bst')) ||
        /\b(tree|bst|binary|node|nodes|ancestor|subtree|leaf|leaves|level|traversal|depth|path|paths|height|bottom|row|rows|tilt|house robber iii|populating)\b/i.test(titleLower);

      if (claimsBinaryTreeInInput && !isLegitimateTreeProblem) {
        console.error(`[BINARY TREE MISCLASSIFICATION] Source: ${src.name} | Slug: ${p.slug} | Title: "${p.title}" | Tags: ${JSON.stringify(p.topicTags)} | InputFormat: "${p.inputFormat}"`);
        binaryTreeMisclassifications++;
      }
    }

    console.log(`\n--- SUMMARY FOR ${src.name} ---`);
    console.log(`Total Problems Checked: ${total}`);
    console.log(`Empty Field Failures: ${emptyFieldFailures}`);
    console.log(`Boilerplate Input/Output Strings: ${boilerplateFailures}`);
    console.log(`Generic Output Fallback Texts: ${fallbackOutputFailures}`);
    console.log(`Binary Tree Parameter Misclassifications: ${binaryTreeMisclassifications}`);

    if (emptyFieldFailures > 0 || boilerplateFailures > 0 || fallbackOutputFailures > 0 || binaryTreeMisclassifications > 0) {
      console.error(`❌ FAIL: ${src.name} failed empirical checks.`);
      sourcePassed = false;
      overallPassed = false;
    } else {
      console.log(`✅ PASS: ${src.name} passed all empirical criteria with 0 issues!\n`);
    }
  }

  console.log('================================================================');
  if (overallPassed) {
    console.log('🎉 FINAL VERDICT: PASS - ALL CANONICAL DSA PROBLEMS MEET EMPIRICAL SPECIFICATIONS 100%');
  } else {
    console.log('❌ FINAL VERDICT: FAIL - EMPIRICAL STRESS TEST DETECTED ISSUES');
    process.exitCode = 1;
  }
}

runEmpiricalStressTest().catch((err) => {
  console.error('Fatal error during validation:', err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
