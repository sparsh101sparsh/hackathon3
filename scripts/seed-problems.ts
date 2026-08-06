import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { ProblemSeedData } from './dataset-helpers';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Starting CodeForge Database Seeding (400+ Problems)...');
  const startTime = Date.now();

  const datasetPath = path.join(__dirname, '..', 'prisma', 'seedData', 'leetcode400.json');
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset file not found at ${datasetPath}. Run 'npx tsx scripts/generate-leetcode-dataset.ts' first.`);
  }

  const rawData = fs.readFileSync(datasetPath, 'utf-8');
  const dataset: ProblemSeedData[] = JSON.parse(rawData);

  console.log(`📦 Loaded ${dataset.length} problems from ${datasetPath}`);

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
  console.log('👤 Seeding Guest Progress...');
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

  // 3. Seed Companies
  console.log('🏢 Seeding Companies...');
  const companyList = [
    { name: 'Google', logo: '/companies/google.svg', description: 'Search, Cloud & Tech Giant' },
    { name: 'Amazon', logo: '/companies/amazon.svg', description: 'E-Commerce & Cloud Infrastructure' },
    { name: 'Microsoft', logo: '/companies/microsoft.svg', description: 'Software, OS, Azure & Gaming' },
    { name: 'Meta', logo: '/companies/meta.svg', description: 'Social Networks & Metaverse' },
    { name: 'Apple', logo: '/companies/apple.svg', description: 'Consumer Electronics & Ecosystem' },
    { name: 'Netflix', logo: '/companies/netflix.svg', description: 'Streaming Media & Content' },
    { name: 'Uber', logo: '/companies/uber.svg', description: 'Ridesharing & Logistics' },
    { name: 'Flipkart', logo: '/companies/flipkart.svg', description: 'Leading E-Commerce Platform' },
  ];

  const companyMap = new Map<string, string>();
  for (const comp of companyList) {
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

  // 4. Seed Problems with Test Cases & Code Templates
  console.log(`🧩 Seeding ${dataset.length} DSA Problems with 5 Language Templates & Test Cases...`);

  let totalTestCasesCreated = 0;
  let totalTemplatesCreated = 0;
  let totalCompanyLinksCreated = 0;
  const createdProblemIds: { id: string; slug: string; difficulty: string }[] = [];

  for (let i = 0; i < dataset.length; i++) {
    const prob = dataset[i];

    const createdProblem = await prisma.problem.create({
      data: {
        title: prob.title,
        slug: prob.slug,
        statement: prob.statement,
        inputFormat: prob.inputFormat,
        outputFormat: prob.outputFormat,
        constraints: prob.constraints,
        difficulty: prob.difficulty,
        topicTags: JSON.stringify(prob.topicTags),
        companyTags: JSON.stringify(prob.companyTags),
        editorial: prob.editorial,
        timeLimit: prob.timeLimit ?? 1.0,
        memoryLimit: prob.memoryLimit ?? 256,
      },
    });

    createdProblemIds.push({
      id: createdProblem.id,
      slug: createdProblem.slug,
      difficulty: createdProblem.difficulty,
    });

    // Seed test cases
    for (const tc of prob.testCases) {
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

    // Seed 5 language templates
    const templates = [
      { language: 'python', code: prob.codeTemplates.python },
      { language: 'cpp', code: prob.codeTemplates.cpp },
      { language: 'javascript', code: prob.codeTemplates.javascript },
      { language: 'java', code: prob.codeTemplates.java },
      { language: 'go', code: prob.codeTemplates.go },
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

    // Seed CompanyProblem links
    for (const compName of prob.companyTags) {
      const companyId = companyMap.get(compName);
      if (companyId) {
        // Compute frequency score 60-99
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

    if ((i + 1) % 50 === 0 || i + 1 === dataset.length) {
      console.log(`   Seeded ${i + 1}/${dataset.length} problems...`);
    }
  }

  // Update company problem counts
  for (const [compName, compId] of companyMap.entries()) {
    const count = await prisma.companyProblem.count({ where: { companyId: compId } });
    await prisma.company.update({
      where: { id: compId },
      data: { problemCount: count },
    });
  }

  // 5. Seed Rated Contests
  console.log('🏆 Seeding Contests...');
  const now = new Date();
  const contestStartTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const contestEndTime = new Date(contestStartTime.getTime() + 2 * 60 * 60 * 1000);

  const contest = await prisma.contest.create({
    data: {
      title: 'CodeForge Weekly Contest 1',
      description: 'Test your speed and problem-solving skills in our inaugural rated contest! Solve 4 DSA challenges.',
      startTime: contestStartTime,
      endTime: contestEndTime,
      isRated: true,
      status: 'UPCOMING',
    },
  });

  const contestSlugs = ['two-sum', 'add-two-numbers', 'longest-substring-without-repeating-characters', 'median-of-two-sorted-arrays'];
  const points = [100, 250, 500, 1000];

  for (let i = 0; i < contestSlugs.length; i++) {
    const slug = contestSlugs[i];
    const prob = createdProblemIds.find((p) => p.slug === slug) || createdProblemIds[i];
    if (prob) {
      await prisma.contestProblem.create({
        data: {
          contestId: contest.id,
          problemId: prob.id,
          points: points[i],
          order: i + 1,
        },
      });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===========================================================');
  console.log(`🎉 DATABASE SEEDING COMPLETED IN ${duration}s!`);
  console.log(`-----------------------------------------------------------`);
  console.log(`Companies seeded:           ${companyList.length}`);
  console.log(`Problems seeded:            ${dataset.length}`);
  console.log(`Test cases seeded:          ${totalTestCasesCreated}`);
  console.log(`Code templates seeded:      ${totalTemplatesCreated} (5 languages: Python, C++, JS, Java, Go)`);
  console.log(`Company-Problem links:      ${totalCompanyLinksCreated}`);
  console.log(`Contests seeded:            1 ("${contest.title}")`);
  console.log('===========================================================\n');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Seeding error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
