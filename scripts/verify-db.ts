import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Running Database Verification Checks for Milestone 2 (400+ Problems)... \n');

  // 1. Verify Anonymous User Progress
  const guestProgress = await prisma.userProgress.findUnique({ where: { userId: 'guest' } });

  console.log(`👤 Anonymous Session Verification:`);
  console.log(`   - Guest User Progress present: ${guestProgress ? 'YES' : 'NO'}\n`);
  if (!guestProgress) {
    throw new Error('Guest user progress is missing!');
  }

  // 2. Verify Problems Count & Difficulty Breakdown
  const problemCount = await prisma.problem.count();
  const easyCount = await prisma.problem.count({ where: { difficulty: 'EASY' } });
  const mediumCount = await prisma.problem.count({ where: { difficulty: 'MEDIUM' } });
  const hardCount = await prisma.problem.count({ where: { difficulty: 'HARD' } });

  console.log(`🧩 Problems Verification:`);
  console.log(`   - Total Problems: ${problemCount} (Requirement: >= 400)`);
  console.log(`   - Easy Problems: ${easyCount}`);
  console.log(`   - Medium Problems: ${mediumCount}`);
  console.log(`   - Hard Problems: ${hardCount}\n`);

  if (problemCount < 400) {
    throw new Error(`Database contains only ${problemCount} problems, expected >= 400!`);
  }

  // 3. Verify Topic Coverage
  const problems = await prisma.problem.findMany({ select: { topicTags: true } });
  const topicSet = new Set<string>();
  problems.forEach((p) => {
    try {
      const tags: string[] = JSON.parse(p.topicTags);
      tags.forEach((t) => topicSet.add(t));
    } catch (e) {
      // ignore
    }
  });

  console.log(`🏷️ Topic Tags Covered (${topicSet.size} unique topics):`);
  console.log(`   - ${Array.from(topicSet).slice(0, 15).join(', ')}... (+${Math.max(0, topicSet.size - 15)} more)\n`);

  // 4. Verify Test Cases & Templates
  const testCaseCount = await prisma.testCase.count();
  const sampleTestCases = await prisma.testCase.count({ where: { isSample: true } });
  const hiddenTestCases = await prisma.testCase.count({ where: { isSample: false } });

  const templateCount = await prisma.codeTemplate.count();
  const pyTemplates = await prisma.codeTemplate.count({ where: { language: 'python' } });
  const cppTemplates = await prisma.codeTemplate.count({ where: { language: 'cpp' } });
  const jsTemplates = await prisma.codeTemplate.count({ where: { language: 'javascript' } });
  const javaTemplates = await prisma.codeTemplate.count({ where: { language: 'java' } });
  const goTemplates = await prisma.codeTemplate.count({ where: { language: 'go' } });

  console.log(`🧪 Test Cases & Code Templates Verification:`);
  console.log(`   - Total Test Cases: ${testCaseCount}`);
  console.log(`   - Sample Test Cases: ${sampleTestCases}`);
  console.log(`   - Hidden Test Cases: ${hiddenTestCases}`);
  console.log(`   - Total Templates: ${templateCount}`);
  console.log(`     (Python: ${pyTemplates}, C++: ${cppTemplates}, JS: ${jsTemplates}, Java: ${javaTemplates}, Go: ${goTemplates})\n`);

  if (pyTemplates < 400 || cppTemplates < 400 || jsTemplates < 400 || javaTemplates < 400 || goTemplates < 400) {
    throw new Error('Code templates for all 5 languages must be present for every problem!');
  }

  // 5. Verify Companies
  const companyCount = await prisma.company.count();
  const companies = await prisma.company.findMany({
    select: { name: true, problemCount: true },
  });

  console.log(`🏢 Companies Verification (${companyCount} companies):`);
  companies.forEach((c) => {
    console.log(`   - ${c.name}: ${c.problemCount} linked problems`);
  });
  console.log('');

  if (companyCount < 8) {
    throw new Error(`Expected at least 8 companies, found ${companyCount}`);
  }

  // 6. Verify Contest
  const contestCount = await prisma.contest.count();
  const activeContest = await prisma.contest.findFirst({
    include: { contestProblems: { include: { problem: { select: { title: true } } } } },
  });

  console.log(`🏆 Contest Verification:`);
  console.log(`   - Total Contests: ${contestCount}`);
  if (activeContest) {
    console.log(`   - Title: "${activeContest.title}"`);
    console.log(`   - Is Rated: ${activeContest.isRated}`);
    console.log(`   - Status: ${activeContest.status}`);
    console.log(`   - Contest Problems (${activeContest.contestProblems.length}):`);
    activeContest.contestProblems.forEach((cp) => {
      console.log(`     #${cp.order} ${cp.problem.title} (${cp.points} pts)`);
    });
  }
  console.log('\n✅ All Database Verification Checks Passed!');
}

verifyDatabase()
  .catch((e) => {
    console.error('❌ Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
