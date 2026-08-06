import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { EXPLICIT_COMPANY_MAPPINGS } from './company-mappings';

export { EXPLICIT_COMPANY_MAPPINGS } from './company-mappings';

const prisma = new PrismaClient();

interface TestCaseSeed {
  input: string;
  expectedOutput: string;
  isSample: boolean;
  explanation?: string;
}

interface CodeTemplatesSeed {
  python: string;
  cpp: string;
  javascript: string;
  java: string;
  go: string;
}

interface ProblemSeedItem {
  id?: string;
  frontendId: number;
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
  timeLimit: number;
  memoryLimit: number;
  testCases: TestCaseSeed[];
  codeTemplates: CodeTemplatesSeed;
}

const COMPANY_LIST = [
  { name: 'Google', logo: '/companies/google.svg', description: 'Search, Cloud & Tech Giant' },
  { name: 'Amazon', logo: '/companies/amazon.svg', description: 'E-Commerce & Cloud Infrastructure' },
  { name: 'Microsoft', logo: '/companies/microsoft.svg', description: 'Software, OS, Azure & Gaming' },
  { name: 'Meta', logo: '/companies/meta.svg', description: 'Social Networks & Metaverse' },
  { name: 'Apple', logo: '/companies/apple.svg', description: 'Consumer Electronics & Ecosystem' },
  { name: 'Netflix', logo: '/companies/netflix.svg', description: 'Streaming Media & Content' },
  { name: 'Uber', logo: '/companies/uber.svg', description: 'Ridesharing & Logistics' },
  { name: 'Flipkart', logo: '/companies/flipkart.svg', description: 'Leading E-Commerce Platform' },
];

function repairCppTemplate(code: string): string {
  return code.replace(
    /(\b(?:int|bool|void|double|float|long\s+long|std::string|std::vector\s*<[^;{}()]+>)\s+)(\d[A-Za-z0-9_]*)\s*(?=\()/g,
    '$1solve$2',
  );
}

function getTopicTagsForIndex(index: number): string[] {
  if (index <= 50) return ['Arrays', 'Hash Table', 'Two Pointers'];
  if (index <= 100) return ['Backtracking', 'String', 'Dynamic Programming'];
  if (index <= 200) return ['Trees', 'BFS', 'DFS', 'Binary Search'];
  if (index <= 300) return ['Bit Manipulation', 'Math', 'Linked List'];
  return ['Advanced DP', 'Graphs', 'Greedy', 'Heap'];
}

function getCompanyTagsForProblem(frontendId: number, index: number): string[] {
  const explicitMatches: string[] = [];
  for (const [companyName, problemIds] of Object.entries(EXPLICIT_COMPANY_MAPPINGS)) {
    if (problemIds.includes(frontendId)) {
      explicitMatches.push(companyName);
    }
  }

  if (explicitMatches.length > 0) {
    return explicitMatches;
  }

  const names = COMPANY_LIST.map((c) => c.name);
  const c1 = names[(index - 1) % names.length];
  const c2 = names[(index + 1) % names.length];
  const c3 = names[(index + 4) % names.length];
  return Array.from(new Set([c1, c2, c3]));
}

export async function loadProblems(): Promise<ProblemSeedItem[]> {
  const datasetPath = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');
  let offlineMap = new Map<number, ProblemSeedItem>();
  if (fs.existsSync(datasetPath)) {
    const rawData = fs.readFileSync(datasetPath, 'utf-8');
    const datasetItems: ProblemSeedItem[] = JSON.parse(rawData);
    datasetItems.forEach((item) => {
      offlineMap.set(item.frontendId, item);
    });
  }

  let problems: ProblemSeedItem[] = [];

  try {
    console.log('📡 Attempting to fetch LeetCode API (https://leetcode.com/api/problems/all/)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://leetcode.com/api/problems/all/', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json() as any;
      if (data && Array.isArray(data.stat_status_pairs)) {
        const freePairs = data.stat_status_pairs
          .filter((p: any) => !p.paid_only && !p.stat.question__hide)
          .sort((a: any, b: any) => a.stat.frontend_question_id - b.stat.frontend_question_id)
          .slice(0, 600);

        console.log(`✅ Fetched ${freePairs.length} free problem entries from LeetCode API.`);

        for (const pair of freePairs) {
          const frontendId = pair.stat.frontend_question_id;
          const title = pair.stat.question__title;
          const slug = pair.stat.question__title_slug;
          const level = pair.difficulty.level;
          const difficulty = level === 1 ? 'EASY' : level === 3 ? 'HARD' : 'MEDIUM';

          const offlineItem = offlineMap.get(frontendId);

          const fnNameParts = slug.split('-').filter(Boolean);
          const rawFunctionName = fnNameParts.length > 0
            ? fnNameParts[0] + fnNameParts.slice(1).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
            : 'solve';
          const functionName = /^[A-Za-z_]/.test(rawFunctionName) ? rawFunctionName : `solve${rawFunctionName}`;

          problems.push({
            frontendId,
            title,
            slug,
            statement: offlineItem?.statement || `Given the input parameters for **${title}**, process the input according to problem requirements.\n\n### Description\nImplement an efficient algorithm for **${title}** operating within standard constraints.`,
            inputFormat: offlineItem?.inputFormat || 'Input provided according to problem parameters.',
            outputFormat: offlineItem?.outputFormat || 'Expected output according to problem specifications.',
            constraints: offlineItem?.constraints || '1 <= N <= 10^5\nAll inputs fit in standard bounds.',
            difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            topicTags: [],
            companyTags: [],
            editorial: offlineItem?.editorial || `### Solution Overview for ${title}\nAnalyze constraints and use standard DSA techniques.\n\n- **Time Complexity:** O(N)\n- **Space Complexity:** O(N)`,
            timeLimit: 1.0,
            memoryLimit: 256,
            testCases: offlineItem?.testCases && offlineItem.testCases.length > 0 ? offlineItem.testCases : [
              { input: '2 7 11 15\n9', expectedOutput: '0 1', isSample: true, explanation: `Sample test case for ${title}` },
              { input: '3 2 4\n6', expectedOutput: '1 2', isSample: true },
              { input: '3 3\n6', expectedOutput: '0 1', isSample: false },
            ],
            codeTemplates: offlineItem?.codeTemplates
              ? { ...offlineItem.codeTemplates, cpp: repairCppTemplate(offlineItem.codeTemplates.cpp) }
              : {
              python: `class Solution:\n    def ${functionName}(self, nums: list[int]) -> int:\n        # Write your solution here\n        pass\n`,
              cpp: `#include <iostream>\n#include <vector>\n\nclass Solution {\npublic:\n    int ${functionName}(std::vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};\n`,
              javascript: `/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction ${functionName}(nums) {\n  // Write your solution here\n}\n`,
              java: `import java.util.*;\n\nclass Solution {\n    public int ${functionName}(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}\n`,
              go: `package main\n\nfunc ${functionName}(nums []int) int {\n    // Write your solution here\n    return 0\n}\n`,
              },
          });
        }
      }
    }
  } catch (err: any) {
    console.log(`ℹ️ LeetCode API notice: ${err.message}. Using offline dataset file.`);
  }

  if (problems.length < 600) {
    const datasetItems = Array.from(offlineMap.values()).sort((a, b) => a.frontendId - b.frontendId);
    problems = datasetItems.slice(0, 600);
    console.log(`📦 Loaded ${problems.length} genuine LeetCode problems from offline dataset.`);
  }

  // Deduplicate by slug to ensure 100% uniqueness
  const seenSlugs = new Set<string>();
  const uniqueProblems: ProblemSeedItem[] = [];
  for (const p of problems) {
    if (p.slug && !seenSlugs.has(p.slug)) {
      seenSlugs.add(p.slug);
      uniqueProblems.push(p);
    }
  }

  return uniqueProblems.map((problem) => ({
    ...problem,
    codeTemplates: { ...problem.codeTemplates, cpp: repairCppTemplate(problem.codeTemplates.cpp) },
  }));
}

export async function seedRealProblems() {
  console.log('🌱 Starting CodeForge Real Problems Seeder (600+ Problems)...');
  const startTime = Date.now();

  const problemsToSeed = await loadProblems();

  if (problemsToSeed.length < 600) {
    throw new Error(`Expected at least 600 problems, got ${problemsToSeed.length}`);
  }

  // 1. Clean existing records in dependency order
  console.log('🧹 Cleaning existing database tables...');
  await prisma.userRating.deleteMany({});
  await prisma.userProgress.deleteMany({});
  await prisma.contestParticipant.deleteMany({});
  await prisma.contestProblem.deleteMany({});
  await prisma.contest.deleteMany({});
  await prisma.companyProblem.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.testCase.deleteMany({});
  await prisma.codeTemplate.deleteMany({});
  await prisma.problem.deleteMany({});

  // 2. Seed Guest User Progress
  console.log('👤 Seeding Guest User Progress...');
  await prisma.userProgress.create({
    data: {
      userId: 'guest',
      solvedEasy: 0,
      solvedMedium: 0,
      solvedHard: 0,
      streak: 0,
      lastActiveDate: new Date(),
    },
  });

  // 3. Seed 8 Companies
  console.log('🏢 Seeding 8 Target Companies...');
  const companyMap = new Map<string, string>();
  for (const comp of COMPANY_LIST) {
    const createdComp = await prisma.company.create({
      data: {
        name: comp.name,
        logo: comp.logo,
        description: comp.description,
        problemCount: 0,
      },
    });
    companyMap.set(comp.name, createdComp.id);
  }

  // 4. Batch Seed Problems, Code Templates, Test Cases, and CompanyProblem links
  console.log(`🧩 Seeding ${problemsToSeed.length} Real Problems in Batches...`);

  let totalTestCasesCreated = 0;
  let totalTemplatesCreated = 0;
  let totalCompanyLinksCreated = 0;
  const createdProblemIds: string[] = [];

  const BATCH_SIZE = 25;
  for (let b = 0; b < problemsToSeed.length; b += BATCH_SIZE) {
    const batch = problemsToSeed.slice(b, b + BATCH_SIZE);

    for (let i = 0; i < batch.length; i++) {
      const globalIndex = b + i + 1; // 1-based index
      const prob = batch[i];

      // Topic tags per problem ranges
      const topicTags = getTopicTagsForIndex(globalIndex);
      // Company tags per problem (explicit mapping by frontendId or fallback)
      const companyTags = getCompanyTagsForProblem(prob.frontendId, globalIndex);

      const createdProblem = await prisma.problem.upsert({
        where: { slug: prob.slug },
        update: {
          title: prob.title,
          statement: prob.statement,
          inputFormat: prob.inputFormat || 'Input provided according to problem parameters.',
          outputFormat: prob.outputFormat || 'Expected output according to problem specifications.',
          constraints: prob.constraints || '1 <= N <= 10^5',
          difficulty: prob.difficulty,
          topicTags: JSON.stringify(topicTags),
          companyTags: JSON.stringify(companyTags),
          editorial: prob.editorial,
          timeLimit: prob.timeLimit ?? 1.0,
          memoryLimit: prob.memoryLimit ?? 256,
        },
        create: {
          title: prob.title,
          slug: prob.slug,
          statement: prob.statement,
          inputFormat: prob.inputFormat || 'Input provided according to problem parameters.',
          outputFormat: prob.outputFormat || 'Expected output according to problem specifications.',
          constraints: prob.constraints || '1 <= N <= 10^5',
          difficulty: prob.difficulty,
          topicTags: JSON.stringify(topicTags),
          companyTags: JSON.stringify(companyTags),
          editorial: prob.editorial,
          timeLimit: prob.timeLimit ?? 1.0,
          memoryLimit: prob.memoryLimit ?? 256,
        },
      });

      createdProblemIds.push(createdProblem.id);

      // Test cases
      let testCases = prob.testCases || [];
      if (testCases.length === 0) {
        testCases = [
          { input: '2 7 11 15\n9', expectedOutput: '0 1', isSample: true, explanation: `Sample case for ${prob.title}` },
          { input: '3 2 4\n6', expectedOutput: '1 2', isSample: true },
          { input: '3 3\n6', expectedOutput: '0 1', isSample: false },
        ];
      }
      const hasSample = testCases.some((tc) => tc.isSample);
      const hasHidden = testCases.some((tc) => !tc.isSample);

      if (!hasSample) testCases[0].isSample = true;
      if (!hasHidden) {
        testCases.push({
          input: '100\n200',
          expectedOutput: '300',
          isSample: false,
          explanation: 'Hidden test case',
        });
      }

      for (const tc of testCases) {
        await prisma.testCase.create({
          data: {
            problemId: createdProblem.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample,
            explanation: tc.explanation || null,
          },
        });
        totalTestCasesCreated++;
      }

      // Code templates (5 languages)
      const templates = [
        { language: 'python', code: prob.codeTemplates?.python || `# Write python solution for ${prob.title}` },
        { language: 'cpp', code: prob.codeTemplates?.cpp || `// Write cpp solution for ${prob.title}` },
        { language: 'javascript', code: prob.codeTemplates?.javascript || `// Write javascript solution for ${prob.title}` },
        { language: 'java', code: prob.codeTemplates?.java || `// Write java solution for ${prob.title}` },
        { language: 'go', code: prob.codeTemplates?.go || `// Write go solution for ${prob.title}` },
      ];

      for (const tmpl of templates) {
        await prisma.codeTemplate.create({
          data: {
            problemId: createdProblem.id,
            language: tmpl.language,
            code: tmpl.code,
          },
        });
        totalTemplatesCreated++;
      }

      // CompanyProblem links
      for (const compName of companyTags) {
        const companyId = companyMap.get(compName);
        if (companyId) {
          const frequency = Math.floor(Math.random() * 35) + 65;
          await prisma.companyProblem.create({
            data: {
              companyId,
              problemId: createdProblem.id,
              frequency,
            },
          });
          totalCompanyLinksCreated++;
        }
      }
    }

    console.log(`   Processed batch ${Math.min(b + BATCH_SIZE, problemsToSeed.length)}/${problemsToSeed.length} problems...`);
  }

  // 5. Update Company Problem Counts
  for (const [compName, compId] of companyMap.entries()) {
    const count = await prisma.companyProblem.count({ where: { companyId: compId } });
    await prisma.company.update({
      where: { id: compId },
      data: { problemCount: count },
    });
  }

  // 6. Seed Rated Contest
  console.log('🏆 Seeding Contest...');
  const now = new Date();
  const contestStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const contestEndTime = new Date(contestStartTime.getTime() + 2 * 60 * 60 * 1000);

  const contest = await prisma.contest.create({
    data: {
      title: 'CodeForge Weekly Contest 1',
      description: 'Test your speed and problem-solving skills in our inaugural rated contest!',
      startTime: contestStartTime,
      endTime: contestEndTime,
      isRated: true,
      status: 'UPCOMING',
    },
  });

  const contestSlugs = ['two-sum', 'add-two-numbers', 'longest-substring-without-repeating-characters', 'median-of-two-sorted-arrays'];
  const points = [100, 250, 500, 1000];

  for (let idx = 0; idx < contestSlugs.length; idx++) {
    const slug = contestSlugs[idx];
    let prob = await prisma.problem.findFirst({ where: { slug } });
    if (!prob && createdProblemIds.length > idx) {
      prob = await prisma.problem.findUnique({ where: { id: createdProblemIds[idx] } });
    }

    if (prob) {
      await prisma.contestProblem.create({
        data: {
          contestId: contest.id,
          problemId: prob.id,
          points: points[idx],
          order: idx + 1,
        },
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===========================================================');
  console.log(`🎉 REAL PROBLEMS SEEDING COMPLETED IN ${duration}s!`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Companies seeded:           ${COMPANY_LIST.length}`);
  console.log(`Problems seeded:            ${problemsToSeed.length}`);
  console.log(`Test cases seeded:          ${totalTestCasesCreated}`);
  console.log(`Code templates seeded:      ${totalTemplatesCreated} (5 languages)`);
  console.log(`Company-Problem links:      ${totalCompanyLinksCreated}`);
  console.log(`Contests seeded:            1 ("${contest.title}")`);
  console.log('===========================================================\n');
}

seedRealProblems()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
