import { prisma } from '../lib/prisma';
import { problemsPart3 } from '../prisma/seedData/problemsPart3';

type SeedRecord = {
  title: string;
  slug: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topicTags: string[];
  companyTags: string[];
  editorial: string;
  testCases: Array<{ input: string; expectedOutput: string; isSample: boolean; explanation?: string }>;
  codeTemplates: Record<string, string>;
};

const sameTree: SeedRecord = {
  title: 'Same Tree',
  slug: 'same-tree',
  statement: 'Given the roots of two binary trees p and q, determine whether they are the same tree. Two trees are the same when they have identical structure and the same node values.',
  inputFormat: 'First line: level-order values for tree p. Second line: level-order values for tree q. Use null for an empty child.',
  outputFormat: '`true` if the trees are identical, otherwise `false`.',
  constraints: 'The number of nodes in each tree is in range [0, 100].\n-10^4 <= Node.val <= 10^4.',
  difficulty: 'EASY',
  topicTags: ['Trees', 'DFS', 'BFS'],
  companyTags: ['Amazon', 'Microsoft', 'Google'],
  editorial: '### Approach: Recursive Pair Comparison\nCompare corresponding nodes together. Both null means the pair matches; one null or different values means it fails. Otherwise compare left children and right children recursively.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(H) for recursion depth.',
  testCases: [
    { input: '1 2 3\n1 2 3', expectedOutput: 'true', isSample: true },
    { input: '1 2\n1 null 2', expectedOutput: 'false', isSample: true },
    { input: '1 2 1\n1 1 2', expectedOutput: 'false', isSample: true },
    { input: '\n', expectedOutput: 'true', isSample: false },
    { input: '1 2 3 4\n1 2 3 4', expectedOutput: 'true', isSample: false },
    { input: '5 3 7\n5 3 8', expectedOutput: 'false', isSample: false },
  ],
  codeTemplates: {
    python: 'def isSameTree(p: list, q: list) -> bool:\n    # Write your solution here\n    pass\n',
    cpp: '#include <vector>\n\nbool isSameTree(std::vector<int>& p, std::vector<int>& q) {\n    // Write your solution here\n    return false;\n}\n',
    javascript: 'function isSameTree(p, q) {\n  // Write your solution here\n}\n',
    java: 'class Solution {\n    public boolean isSameTree(Integer[] p, Integer[] q) {\n        // Write your solution here\n        return false;\n    }\n}\n',
    go: 'package main\n\nfunc isSameTree(p []int, q []int) bool {\n    // Write your solution here\n    return false\n}\n',
  },
};

const part3Records = problemsPart3
  .filter((problem) => problem.slug === 'number-of-islands' || problem.slug === 'longest-increasing-subsequence')
  .map((problem): SeedRecord => ({
    ...problem,
    codeTemplates: {
      ...problem.codeTemplates,
      java: `class Solution {\n    public ${problem.slug === 'number-of-islands' ? 'int numIslands(char[][] grid)' : 'int lengthOfLIS(int[] nums)'} {\n        // Write your solution here\n        return 0;\n    }\n}\n`,
      go: `package main\n\nfunc ${problem.slug === 'number-of-islands' ? 'numIslands(grid [][]byte)' : 'lengthOfLIS(nums []int)'} int {\n    // Write your solution here\n    return 0\n}\n`,
    },
  }));

const records = [sameTree, ...part3Records];

async function main() {
  for (const record of records) {
    const existing = await prisma.problem.findUnique({ where: { slug: record.slug }, select: { id: true } });
    if (existing) {
      console.log(`exists: ${record.slug} (${existing.id})`);
      continue;
    }

    const problem = await prisma.problem.create({
      data: {
        title: record.title,
        slug: record.slug,
        statement: record.statement,
        inputFormat: record.inputFormat,
        outputFormat: record.outputFormat,
        constraints: record.constraints,
        difficulty: record.difficulty,
        topicTags: JSON.stringify(record.topicTags),
        companyTags: JSON.stringify(record.companyTags),
        editorial: record.editorial,
        timeLimit: 1,
        memoryLimit: 256,
        testCases: { create: record.testCases },
        codeTemplates: {
          create: Object.entries(record.codeTemplates).map(([language, code]) => ({ language, code })),
        },
      },
      select: { id: true, slug: true },
    });
    console.log(`created: ${problem.slug} (${problem.id})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
