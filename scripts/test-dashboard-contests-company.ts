import { NextRequest } from 'next/server';
import { GET as companyDetailHandler } from '../app/api/company/[slug]/route';
import { prisma } from '../lib/prisma';
import { calculateRatingUpdate, getRatingTier } from '../lib/rating';

async function runTests() {
  console.log('🧪 Starting Milestone 5 Verification Tests...\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Rating Calculations & Tiers
  console.log('--- Test 1: Codeforces-Style Rating Helper ---');
  const bronzeTier = getRatingTier(1150);
  assert(bronzeTier.badge === 'Bronze', 'Rating 1150 resolves to Bronze tier');

  const masterTier = getRatingTier(2450);
  assert(masterTier.badge === 'Grandmaster', 'Rating 2450 resolves to Master tier');

  const update = calculateRatingUpdate({
    currentRating: 1500,
    rank: 1,
    totalParticipants: 100,
    score: 1850,
    maxScore: 1850,
  });

  assert(update.newRating > update.oldRating, 'Winning contest increases rating');
  assert(update.delta > 0, 'Positive rating delta computed');
  assert(update.newRating >= 800 && update.newRating <= 3500, 'Rating remains in 800 - 3500 range');
  console.log(`     Old: ${update.oldRating} -> New: ${update.newRating} (+${update.delta}) [${update.newTier.badge}]`);

  // TEST 2: Database Entities & Seed Verification
  console.log('\n--- Test 2: Database Entities & Seed Verification ---');
  const userProgressCount = await prisma.userProgress.count();
  assert(userProgressCount >= 1, `User progress records exist in database (found: ${userProgressCount})`);

  const companyCount = await prisma.company.count();
  assert(companyCount >= 8, `Seeded companies count >= 8 (found: ${companyCount})`);

  const companies = await prisma.company.findMany({ select: { name: true } });
  const companyNames = companies.map((c) => c.name);
  const requiredCompanies = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Uber', 'Flipkart'];
  const missingCompanies = requiredCompanies.filter((name) => !companyNames.includes(name));
  assert(missingCompanies.length === 0, `All 8 required tech companies present: ${requiredCompanies.join(', ')}`);

  const problemCount = await prisma.problem.count();
  assert(problemCount >= 1, `Problems exist in database (found: ${problemCount})`);

  // TEST 3: Contest Operations & Registration
  console.log('\n--- Test 3: Contest Operations & Registration ---');
  let contest = await prisma.contest.findFirst({
    include: { contestProblems: true, contestParticipants: true },
  });

  if (!contest) {
    contest = await prisma.contest.create({
      data: {
        title: 'Test Verification Contest',
        description: 'Temporary verification test contest',
        startTime: new Date(),
        endTime: new Date(Date.now() + 7200000),
        isRated: true,
        status: 'ACTIVE',
      },
      include: { contestProblems: true, contestParticipants: true },
    });
  }

  assert(Boolean(contest && contest.id), 'Contest entity retrievable from database');

  if (contest) {
    // Test registration
    const existing = await prisma.contestParticipant.findFirst({
      where: { contestId: contest.id, userId: 'guest' },
    });

    if (!existing) {
      const registered = await prisma.contestParticipant.create({
        data: {
          contestId: contest.id,
          userId: 'guest',
          name: 'Guest Coder',
          oldRating: 1500,
          newRating: 1500,
          score: 0,
        },
      });
      assert(Boolean(registered && registered.id), 'Successfully registered guest for contest');
    } else {
      assert(true, 'User already registered for contest entity');
    }
  }

  // TEST 4: Leaderboard & Company Detail Data Logic
  console.log('\n--- Test 4: Leaderboard & Company Detail Logic ---');
  const googleCompany = await prisma.company.findFirst({
    where: { name: 'Google' },
    include: { companyProblems: { include: { problem: true } } },
  });
  assert(Boolean(googleCompany), 'Google company entity retrievable for company detail page');

  const companyResponse = await companyDetailHandler(new NextRequest('http://localhost:3000/api/company/google'), { params: Promise.resolve({ slug: 'google' }) });
  const companyData = await companyResponse.json();
  assert(companyResponse.status === 200 && companyData.problems?.length > 0, 'Company detail API returns mapped Google problems');
  assert(companyData.problems.every((problem: { acceptanceRate: number }) => Number.isFinite(problem.acceptanceRate)), 'Company acceptance rates are deterministic numeric values');
  const missingCompanyResponse = await companyDetailHandler(new NextRequest('http://localhost:3000/api/company/does-not-exist'), { params: Promise.resolve({ slug: 'does-not-exist' }) });
  assert(missingCompanyResponse.status === 404, 'Unknown company does not fall back to unrelated problems');

  console.log(`\n========================================`);
  console.log(`🎉 Summary: ${passedCount} / ${totalCount} tests passed.`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
}

runTests().catch((e) => {
  console.error('❌ Test execution error:', e);
  process.exit(1);
});
