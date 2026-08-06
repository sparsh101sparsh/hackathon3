import fs from 'node:fs';

const directory = fs.readFileSync('app/company/page.tsx', 'utf8');
const detail = fs.readFileSync('app/company/[slug]/page.tsx', 'utf8');

if (/system\s+design\s+evaluator/i.test(directory)) {
  throw new Error('Company directory must not contain the system-design evaluator surface.');
}
if (!directory.includes('View Question Bank') || !directory.includes('question banks')) {
  throw new Error('Company directory must remain an explicit coding question-bank surface.');
}
if (!detail.includes('Solve') || !detail.includes('Interview Frequency')) {
  throw new Error('Company detail must expose searchable, frequency-tagged coding questions.');
}

console.log('Company surface verification: evaluator removed and question-bank workflow preserved.');
