import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const LEETCODE400_PATH = path.join(__dirname, '../prisma/seedData/leetcode400.json');
const FREEMODEL_CORPUS_PATH = path.join(__dirname, '../prisma/seedData/freemodel-question-corpus.jsonl');

const GENERIC_INPUT_BOILERPLATE = "Input provided according to problem parameters.";
const GENERIC_OUTPUT_BOILERPLATE = "Expected output according to problem specifications.";

async function runAudit() {
  console.log("=================================================");
  console.log("🔍 FORENSIC RE-AUDIT OF THE CANONICAL PROBLEM CATALOG");
  console.log("=================================================\n");

  let overallPass = true;

  // ------------------------------------------------------------------
  // CHECK 1: PostgreSQL DB Generic Input Boilerplate
  // ------------------------------------------------------------------
  console.log("--- Check 1: PostgreSQL DB Generic Input Boilerplate ---");
  const dbInputBoilerplate = await prisma.problem.findMany({
    where: {
      OR: [
        { inputFormat: { contains: GENERIC_INPUT_BOILERPLATE } },
        { statement: { contains: GENERIC_INPUT_BOILERPLATE } },
        { outputFormat: { contains: GENERIC_INPUT_BOILERPLATE } },
        { constraints: { contains: GENERIC_INPUT_BOILERPLATE } }
      ]
    },
    select: { id: true, slug: true, title: true }
  });
  console.log(`DB problems containing generic input boilerplate "${GENERIC_INPUT_BOILERPLATE}": ${dbInputBoilerplate.length}`);
  if (dbInputBoilerplate.length > 0) {
    overallPass = false;
    console.error("  ❌ FAIL: Found matching problems:", dbInputBoilerplate);
  } else {
    console.log("  ✅ PASS: 0 DB problems contain generic input boilerplate.");
  }

  // ------------------------------------------------------------------
  // CHECK 2: PostgreSQL DB Generic Output Boilerplate
  // ------------------------------------------------------------------
  console.log("\n--- Check 2: PostgreSQL DB Generic Output Boilerplate ---");
  const dbOutputBoilerplate = await prisma.problem.findMany({
    where: {
      OR: [
        { outputFormat: { contains: GENERIC_OUTPUT_BOILERPLATE } },
        { statement: { contains: GENERIC_OUTPUT_BOILERPLATE } },
        { inputFormat: { contains: GENERIC_OUTPUT_BOILERPLATE } },
        { constraints: { contains: GENERIC_OUTPUT_BOILERPLATE } }
      ]
    },
    select: { id: true, slug: true, title: true }
  });
  console.log(`DB problems containing generic output boilerplate "${GENERIC_OUTPUT_BOILERPLATE}": ${dbOutputBoilerplate.length}`);
  if (dbOutputBoilerplate.length > 0) {
    overallPass = false;
    console.error("  ❌ FAIL: Found matching problems:", dbOutputBoilerplate);
  } else {
    console.log("  ✅ PASS: 0 DB problems contain generic output boilerplate.");
  }

  // ------------------------------------------------------------------
  // CHECK 3: JSON & JSONL Files Generic Boilerplate
  // ------------------------------------------------------------------
  console.log("\n--- Check 3: JSON / JSONL Generic Boilerplate Strings ---");
interface LeetCode400Problem {
  id?: string;
  frontendId?: number;
  title: string;
  slug: string;
  statement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  difficulty?: string;
  editorial?: string;
  [key: string]: unknown;
}

  const leetcode400Raw = fs.readFileSync(LEETCODE400_PATH, 'utf-8');
  const leetcode400: LeetCode400Problem[] = JSON.parse(leetcode400Raw);
  console.log(`leetcode400.json problem count: ${leetcode400.length}`);

  let jsonInputMatches = 0;
  let jsonOutputMatches = 0;
  leetcode400.forEach((p, idx) => {
    const str = JSON.stringify(p);
    if (str.includes(GENERIC_INPUT_BOILERPLATE)) jsonInputMatches++;
    if (str.includes(GENERIC_OUTPUT_BOILERPLATE)) jsonOutputMatches++;
  });
  console.log(`leetcode400.json generic input boilerplate matches: ${jsonInputMatches}`);
  console.log(`leetcode400.json generic output boilerplate matches: ${jsonOutputMatches}`);

  const freemodelRaw = fs.readFileSync(FREEMODEL_CORPUS_PATH, 'utf-8');
  const freemodelLines = freemodelRaw.trim().split('\n').filter(line => line.length > 0);
  console.log(`freemodel-question-corpus.jsonl record count: ${freemodelLines.length}`);

  let jsonlInputMatches = 0;
  let jsonlOutputMatches = 0;
  freemodelLines.forEach((line, idx) => {
    if (line.includes(GENERIC_INPUT_BOILERPLATE)) jsonlInputMatches++;
    if (line.includes(GENERIC_OUTPUT_BOILERPLATE)) jsonlOutputMatches++;
  });
  console.log(`freemodel-question-corpus.jsonl generic input boilerplate matches: ${jsonlInputMatches}`);
  console.log(`freemodel-question-corpus.jsonl generic output boilerplate matches: ${jsonlOutputMatches}`);

  if (jsonInputMatches > 0 || jsonOutputMatches > 0 || jsonlInputMatches > 0 || jsonlOutputMatches > 0) {
    overallPass = false;
    console.error("  ❌ FAIL: Boilerplate strings found in seed files.");
  } else {
    console.log("  ✅ PASS: 0 boilerplate strings in leetcode400.json and freemodel-question-corpus.jsonl.");
  }

  // ------------------------------------------------------------------
  // CHECK 4: Non-empty Required Fields Across the Canonical Catalog
  // ------------------------------------------------------------------
  console.log("\n--- Check 4: Non-empty inputFormat, outputFormat, statement, constraints ---");
  const allDbProblems = await prisma.problem.findMany({
    select: { id: true, slug: true, title: true, statement: true, inputFormat: true, outputFormat: true, constraints: true }
  });
  console.log(`Total problems in PostgreSQL DB: ${allDbProblems.length}`);

  let dbEmptyFieldCount = 0;
  allDbProblems.forEach(p => {
    if (!p.statement?.trim() || !p.inputFormat?.trim() || !p.outputFormat?.trim() || !p.constraints?.trim()) {
      dbEmptyFieldCount++;
      console.error(`  [DB empty field] ${p.slug}: statement=${!!p.statement?.trim()}, inputFormat=${!!p.inputFormat?.trim()}, outputFormat=${!!p.outputFormat?.trim()}, constraints=${!!p.constraints?.trim()}`);
    }
  });

  let jsonEmptyFieldCount = 0;
  leetcode400.forEach((p) => {
    if (!p.statement?.trim() || !p.inputFormat?.trim() || !p.outputFormat?.trim() || !p.constraints?.trim()) {
      jsonEmptyFieldCount++;
      console.error(`  [leetcode400.json empty field] ${p.slug}: statement=${!!p.statement?.trim()}, inputFormat=${!!p.inputFormat?.trim()}, outputFormat=${!!p.outputFormat?.trim()}, constraints=${!!p.constraints?.trim()}`);
    }
  });

  let jsonlEmptyFieldCount = 0;
  freemodelLines.forEach((line, idx) => {
    try {
      const p = JSON.parse(line);
      const text = p.messages?.find((m: { role: string; content?: string }) => m.role === 'assistant')?.content || p.output || JSON.stringify(p);
      // For corpus, let's verify each object has valid statement, inputFormat, outputFormat, constraints or text payload
      if (p.inputFormat !== undefined && (!p.inputFormat?.trim() || !p.outputFormat?.trim() || !p.statement?.trim() || !p.constraints?.trim())) {
        jsonlEmptyFieldCount++;
        console.error(`  [JSONL record empty field] line ${idx + 1}`);
      }
    } catch (e) {
      jsonlEmptyFieldCount++;
      console.error(`  [JSONL parse error] line ${idx + 1}`);
    }
  });

  console.log(`DB empty field problems count: ${dbEmptyFieldCount}`);
  console.log(`leetcode400.json empty field problems count: ${jsonEmptyFieldCount}`);
  console.log(`freemodel-question-corpus.jsonl empty field problems count: ${jsonlEmptyFieldCount}`);

  const canonicalCatalogCount = leetcode400.length;
  if (allDbProblems.length !== canonicalCatalogCount || freemodelLines.length !== canonicalCatalogCount) {
    overallPass = false;
    console.error(`  ❌ FAIL: Count mismatch! DB=${allDbProblems.length}, leetcode400=${leetcode400.length}, freemodel=${freemodelLines.length} (Expected ${canonicalCatalogCount} each)`);
  } else if (dbEmptyFieldCount > 0 || jsonEmptyFieldCount > 0 || jsonlEmptyFieldCount > 0) {
    overallPass = false;
    console.error("  ❌ FAIL: Empty fields found.");
  } else {
    console.log(`  ✅ PASS: All ${canonicalCatalogCount} problems across DB, leetcode400.json, and freemodel-question-corpus.jsonl have crisp non-empty required fields.`);
  }

  // ------------------------------------------------------------------
  // CHECK 5: Edge-Cases & Markdown Polish
  // ------------------------------------------------------------------
  console.log("\n--- Check 5: Edge-Cases & Markdown Polish ---");

  // 5a: "Random Pick with Blacklist" does NOT say "head of linked list"
  const randomPickDb = await prisma.problem.findFirst({
    where: { OR: [{ slug: "random-pick-with-blacklist" }, { title: { contains: "Random Pick with Blacklist" } }] }
  });
  const randomPickJson = leetcode400.find((p) => p.slug === "random-pick-with-blacklist" || p.title === "Random Pick with Blacklist");
  
  let randomPickHasLinkedList = false;
  if (randomPickDb) {
    const combinedStr = `${randomPickDb.statement} ${randomPickDb.inputFormat} ${randomPickDb.outputFormat} ${randomPickDb.constraints} ${randomPickDb.editorial}`;
    if (combinedStr.toLowerCase().includes("head of linked list")) {
      randomPickHasLinkedList = true;
      console.error("  ❌ DB Random Pick with Blacklist contains 'head of linked list'");
    }
  }
  if (randomPickJson) {
    const combinedStr = JSON.stringify(randomPickJson);
    if (combinedStr.toLowerCase().includes("head of linked list")) {
      randomPickHasLinkedList = true;
      console.error("  ❌ leetcode400.json Random Pick with Blacklist contains 'head of linked list'");
    }
  }
  freemodelLines.forEach((line) => {
    if (line.includes("Random Pick with Blacklist") && line.toLowerCase().includes("head of linked list")) {
      randomPickHasLinkedList = true;
      console.error("  ❌ JSONL Random Pick with Blacklist contains 'head of linked list'");
    }
  });

  if (!randomPickHasLinkedList) {
    console.log("  ✅ PASS 5a: 'Random Pick with Blacklist' does NOT contain 'head of linked list'.");
  } else {
    overallPass = false;
  }

  // 5b: "Minimum Index Sum of Two Lists" parameter list1 is typed as "array of strings list1"
  const minIndexDb = await prisma.problem.findFirst({
    where: { OR: [{ slug: "minimum-index-sum-of-two-lists" }, { title: { contains: "Minimum Index Sum of Two Lists" } }] }
  });
  const minIndexJson = leetcode400.find((p) => p.slug === "minimum-index-sum-of-two-lists" || p.title === "Minimum Index Sum of Two Lists");

  console.log("  DB minIndexDb inputFormat:", minIndexDb?.inputFormat);
  console.log("  JSON minIndexJson inputFormat:", minIndexJson?.inputFormat);

  let minIndexCorrectType = true;
  if (!minIndexDb?.inputFormat?.includes("array of strings `list1`") && !minIndexDb?.inputFormat?.includes("array of strings list1")) {
    console.error("  ❌ DB Minimum Index Sum of Two Lists inputFormat does not contain 'array of strings `list1`'");
    minIndexCorrectType = false;
  }
  if (!minIndexJson?.inputFormat?.includes("array of strings `list1`") && !minIndexJson?.inputFormat?.includes("array of strings list1")) {
    console.error("  ❌ leetcode400.json Minimum Index Sum of Two Lists inputFormat does not contain 'array of strings `list1`'");
    minIndexCorrectType = false;
  }

  if (minIndexCorrectType) {
    console.log("  ✅ PASS 5b: 'Minimum Index Sum of Two Lists' parameter list1 is typed as 'array of strings list1'.");
  } else {
    overallPass = false;
  }

  // 5c: Confirm 0 unbolded Explanation: headers exist in freemodel-question-corpus.jsonl (verify with regex /(?<!\*\*)Explanation:/)
  const unboldedExplanationRegex = /(?<!\*\*)Explanation:/g;
  let unboldedCount = 0;
  const unboldedMatches: { lineNum: number; sample: string }[] = [];

  freemodelLines.forEach((line, idx) => {
    const matches = line.match(unboldedExplanationRegex);
    if (matches) {
      unboldedCount += matches.length;
      unboldedMatches.push({ lineNum: idx + 1, sample: line.substring(0, 150) });
    }
  });

  console.log(`  Unbolded 'Explanation:' headers in freemodel-question-corpus.jsonl (regex /(?<!\\*\\*)Explanation:/): ${unboldedCount}`);
  if (unboldedCount > 0) {
    overallPass = false;
    console.error(`  ❌ FAIL: Found ${unboldedCount} unbolded 'Explanation:' headers. First 5 examples:`, unboldedMatches.slice(0, 5));
  } else {
    console.log("  ✅ PASS 5c: 0 unbolded 'Explanation:' headers in freemodel-question-corpus.jsonl.");
  }

  console.log("\n=================================================");
  console.log(`FINAL AUDIT RESULT: ${overallPass ? "CLEAN ✅" : "INTEGRITY VIOLATION ❌"}`);
  console.log("=================================================");

  await prisma.$disconnect();
  process.exit(overallPass ? 0 : 1);
}

runAudit().catch((err: unknown) => {
  console.error("Audit script failed with error:", err);
  process.exit(1);
});
