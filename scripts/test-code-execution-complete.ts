import { executeCode } from '../lib/piston';

type Case = {
  name: string;
  language: string;
  code: string;
  stdin?: string;
  expectedVerdict: string;
  expectedOutput?: string;
};

const cases: Case[] = [
  {
    name: 'Python addition', language: 'python', stdin: '5 7', expectedVerdict: 'Accepted', expectedOutput: '12',
    code: 'import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)',
  },
  {
    name: 'C++ addition', language: 'cpp', stdin: '8 9', expectedVerdict: 'Accepted', expectedOutput: '17',
    code: '#include <iostream>\nint main() { int a, b; std::cin >> a >> b; std::cout << a + b; }',
  },
  {
    name: 'JavaScript addition', language: 'javascript', stdin: '10 25', expectedVerdict: 'Accepted', expectedOutput: '35',
    code: "const fs = require('fs'); const [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number); console.log(a + b);",
  },
  {
    name: 'Java addition', language: 'java', stdin: '11 13', expectedVerdict: 'Accepted', expectedOutput: '24',
    code: 'import java.util.*; public class Main { public static void main(String[] args) { Scanner s = new Scanner(System.in); System.out.print(s.nextInt() + s.nextInt()); } }',
  },
  {
    name: 'Go addition', language: 'go', stdin: '14 16', expectedVerdict: 'Accepted', expectedOutput: '30',
    code: 'package main\nimport "fmt"\nfunc main() { var a, b int; fmt.Scan(&a, &b); fmt.Print(a+b) }',
  },
  {
    name: 'Python runtime error', language: 'python', expectedVerdict: 'Runtime Error',
    code: 'raise RuntimeError("intentional test failure")',
  },
  {
    name: 'C++ compilation error', language: 'cpp', expectedVerdict: 'Compilation Error',
    code: '#include <header_that_does_not_exist_for_codeforge_test>\nint main() {}',
  },
];

let failures = 0;
async function main() {
  for (const testCase of cases) {
    const result = await executeCode(testCase.language, testCase.code, testCase.stdin || '');
    const outputMatches = testCase.expectedOutput === undefined || result.stdout.trim() === testCase.expectedOutput;
    const verdictMatches = result.verdict === testCase.expectedVerdict;
    if (verdictMatches && outputMatches) {
      console.log(`PASS ${testCase.name}: ${result.verdict}${testCase.expectedOutput ? ` (${result.stdout.trim()})` : ''}`);
    } else {
      failures += 1;
      console.error(`FAIL ${testCase.name}: expected ${testCase.expectedVerdict}${testCase.expectedOutput ? ` / ${testCase.expectedOutput}` : ''}, got ${result.verdict} / ${JSON.stringify(result.stdout)}`);
    }
  }

  if (failures > 0) {
    console.error(`Live execution matrix failed with ${failures} failure(s).`);
    process.exit(1);
  }

  console.log(`Live execution matrix passed: ${cases.length}/${cases.length} cases.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
