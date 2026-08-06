const { PrismaClient } = require('@prisma/client');
const http = require('http');

const prisma = new PrismaClient();

async function runEmpiricalVerification() {
  console.log('===========================================================');
  console.log('🚀 EMPIRICAL VERIFICATION HARNESS: MILESTONE 1 (AUTH REMOVAL)');
  console.log('===========================================================\n');

  let errors = 0;

  // 1. Prisma & DB Query Tests (No User FK Constraint Errors)
  console.log('--- 1. DATABASE & PRISMA MODEL TESTS ---');
  try {
    // a. Query UserProgress for guest
    const progress = await prisma.userProgress.findFirst();
    console.log(`[PASS] UserProgress queried without User table FK error. Found: ${progress ? progress.userId : 'none'}`);

    // b. Create a test submission
    const problem = await prisma.problem.findFirst();
    if (!problem) throw new Error('No problem found to create test submission');

    const testSub = await prisma.submission.create({
      data: {
        userId: 'guest',
        problemId: problem.id,
        code: 'def twoSum(nums, target): return [0, 1]',
        language: 'python',
        status: 'Accepted',
        executionTime: 12.5,
        memory: 14.2
      }
    });
    console.log(`[PASS] Created Submission (id: ${testSub.id}) with userId='guest' - No FK constraint on User table`);

    // c. Query Submissions
    const subs = await prisma.submission.findMany({ where: { userId: 'guest' } });
    console.log(`[PASS] Queried ${subs.length} submissions for guest user successfully`);

    // d. Clean up test submission
    await prisma.submission.delete({ where: { id: testSub.id } });
    console.log(`[PASS] Deleted test submission cleanly`);

    // e. Query Contest & ContestParticipant
    const contest = await prisma.contest.findFirst();
    if (contest) {
      const participant = await prisma.contestParticipant.create({
        data: {
          contestId: contest.id,
          userId: 'guest',
          name: 'Empirical Tester',
          score: 100
        }
      });
      console.log(`[PASS] Created ContestParticipant with userId='guest' - No User FK error`);

      await prisma.contestParticipant.delete({ where: { id: participant.id } });
      console.log(`[PASS] Deleted test ContestParticipant cleanly`);
    }

    // f. Verify all model counts
    const countProblem = await prisma.problem.count();
    const countTemplate = await prisma.codeTemplate.count();
    const countTestCase = await prisma.testCase.count();
    const countCompany = await prisma.company.count();
    const countContest = await prisma.contest.count();

    console.log(`[PASS] Model counts retrieved successfully:`);
    console.log(`       - Problems: ${countProblem}`);
    console.log(`       - CodeTemplates: ${countTemplate}`);
    console.log(`       - TestCases: ${countTestCase}`);
    console.log(`       - Companies: ${countCompany}`);
    console.log(`       - Contests: ${countContest}`);

  } catch (err) {
    console.error(`[FAIL] Database test error:`, err);
    errors++;
  }

  // 2. HTTP Route Verification (14 UI pages & API endpoints)
  console.log('\n--- 2. HTTP ROUTE VERIFICATION (No Auth) ---');

  const PORT = process.env.PORT || 3088;
  const BASE_URL = `http://localhost:${PORT}`;

  const firstProblem = await prisma.problem.findFirst();
  const problemId = firstProblem ? firstProblem.id : 'test-id';
  const firstContest = await prisma.contest.findFirst();
  const contestId = firstContest ? firstContest.id : 'test-contest-id';

  // All 14 actual page routes in the application
  const uiRoutesToTest = [
    '/',
    '/dashboard',
    '/admin',
    '/admin/problems/new',
    `/admin/problems/${problemId}/edit`,
    '/company',
    '/company/google',
    '/company/system-design',
    '/contests',
    `/contests/${contestId}`,
    '/leaderboard',
    '/mock-interview',
    '/problems',
    `/problems/${problemId}`
  ];

  const apiRoutesToTest = [
    '/api/problems',
    `/api/problems/${problemId}`,
    '/api/company',
    '/api/company/google',
    '/api/contests',
    `/api/contests/${contestId}`,
    '/api/leaderboard',
    '/api/submissions',
    '/api/admin/stats',
    '/api/admin/problems',
    '/api/admin/users',
    '/api/dashboard/stats',
    '/api/dashboard/weekly-report'
  ];

  const removedAuthRoutes = [
    '/login',
    '/register',
    '/auth/signin',
    '/auth/signup',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/session',
    '/api/auth/callback'
  ];

  function fetchUrl(urlPath) {
    return new Promise((resolve) => {
      const u = new URL(urlPath, BASE_URL);
      http.get(u, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }).on('error', (e) => resolve({ statusCode: 0, error: e.message }));
    });
  }

  console.log(`\nTesting 14 UI Routes (${uiRoutesToTest.length} routes):`);
  for (const route of uiRoutesToTest) {
    const res = await fetchUrl(route);
    if (res.statusCode === 200) {
      console.log(`  [200 OK] ${route}`);
    } else {
      console.error(`  [FAIL ${res.statusCode}] ${route}`);
      errors++;
    }
  }

  console.log(`\nTesting API Routes (${apiRoutesToTest.length} routes):`);
  for (const route of apiRoutesToTest) {
    const res = await fetchUrl(route);
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log(`  [${res.statusCode} OK] ${route}`);
    } else {
      console.error(`  [FAIL ${res.statusCode}] ${route}`);
      errors++;
    }
  }

  console.log(`\nTesting Removed Auth Routes (${removedAuthRoutes.length} routes - expected 404):`);
  for (const route of removedAuthRoutes) {
    const res = await fetchUrl(route);
    if (res.statusCode === 404) {
      console.log(`  [404 NOT FOUND] ${route}`);
    } else {
      console.error(`  [FAIL ${res.statusCode}] ${route} (Should be 404)`);
      errors++;
    }
  }

  console.log('\n===========================================================');
  if (errors === 0) {
    console.log('🎉 ALL EMPIRICAL VERIFICATION CHECKS PASSED PERFECTLY!');
  } else {
    console.error(`❌ VERIFICATION FAILED WITH ${errors} ERRORS`);
  }
  console.log('===========================================================');

  await prisma.$disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

runEmpiricalVerification();
