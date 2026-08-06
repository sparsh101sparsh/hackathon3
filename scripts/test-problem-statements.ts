import fs from 'node:fs';
import path from 'node:path';

type Problem = {
  slug?: string;
  title?: string;
  statement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
};

const catalogPath = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');
const problems = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as Problem[];
const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

check(problems.length >= 600, `expected at least 600 catalog entries, found ${problems.length}`);
check(new Set(problems.map((problem) => problem.slug)).size === problems.length, 'catalog slugs must be unique');

for (const problem of problems) {
  const id = problem.slug || problem.title || '<untitled>';
  const statement = problem.statement || '';
  const inputFormat = problem.inputFormat || '';
  const outputFormat = problem.outputFormat || '';
  const constraints = problem.constraints || '';

  check(statement.trim().length >= 40, `${id}: statement is too short`);
  check(inputFormat.trim().length >= 12, `${id}: input format is missing`);
  check(outputFormat.trim().length >= 12, `${id}: output format is missing`);
  check(constraints.trim().length >= 8, `${id}: constraints are missing`);
  // Angle-bracket syntax is valid problem content (for example tag parsing and
  // generic types). Reject only common extraction tags, not algorithm syntax.
  check(!/<\/?(?:p|div|span|br|li|ul|ol|strong|em|a)(?:\s|>)/.test(statement), `${id}: statement contains extracted HTML`);
  check(!/[\u200B-\u200D\uFEFF\u2060]/.test(statement), `${id}: statement contains invisible characters`);
  check(!/[\u4E00-\u9FFF]/.test(statement), `${id}: statement contains non-English CJK text`);
  check(!/\*{3,}/.test(statement), `${id}: statement contains malformed emphasis`);
  check(!/(?<!\*)\*(?:Example\s+\d+|Input|Output|Explanation)\s*:\*(?!\*)/i.test(statement), `${id}: statement contains single-star labels`);
  check((statement.match(/```/g) || []).length % 2 === 0, `${id}: statement has unbalanced code fences`);
}

if (failures.length > 0) {
  console.error(`Problem statement quality failed with ${failures.length} issue(s):`);
  for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Problem statement quality passed for ${problems.length} catalog entries.`);
