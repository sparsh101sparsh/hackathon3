import { PrismaClient } from '@prisma/client';
import { GET as getProblems } from '../app/api/problems/route';
import { GET as getProblemById } from '../app/api/problems/[id]/route';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string, data?: any) {
  results.push({ name, passed, details, data });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name} - ${details}`);
}

async function runEmpiricalTests() {
  console.log('====================================================');
  console.log('  EMPIRICAL CHALLENGER VERIFICATION FOR MILESTONE 2 ');
  console.log('====================================================\n');

  // --- 1. DIRECT PRISMA QUERIES & COUNTS ---
  console.log('--- 1. DIRECT PRISMA QUERIES ---');

  // 1.1 Problem Count >= 400
  const problemCount = await prisma.problem.count();
  record(
    'Problem Count Requirement (>= 400)',
    problemCount >= 400,
    `Total problems in DB: ${problemCount}`
  );

  // 1.2 Test Cases Count >= 1000
  const testCaseCount = await prisma.testCase.count();
  record(
    'Test Cases Count Requirement (>= 1000)',
    testCaseCount >= 1000,
    `Total test cases in DB: ${testCaseCount}`
  );

  // 1.3 Sample & Hidden Test Cases
  const sampleTestCaseCount = await prisma.testCase.count({ where: { isSample: true } });
  const hiddenTestCaseCount = await prisma.testCase.count({ where: { isSample: false } });
  record(
    'Sample & Hidden Test Cases Breakdown',
    sampleTestCaseCount > 0 && hiddenTestCaseCount > 0,
    `Sample test cases: ${sampleTestCaseCount}, Hidden test cases: ${hiddenTestCaseCount}`
  );

  // 1.4 Company Tags / Companies >= 8
  const companyCount = await prisma.company.count();
  const allProblemsCompanyTags = await prisma.problem.findMany({ select: { companyTags: true } });
  const uniqueCompanyTags = new Set<string>();
  let invalidCompanyTagJsonCount = 0;

  allProblemsCompanyTags.forEach((p) => {
    try {
      const tags = JSON.parse(p.companyTags);
      if (Array.isArray(tags)) {
        tags.forEach((t) => uniqueCompanyTags.add(t));
      }
    } catch {
      invalidCompanyTagJsonCount++;
    }
  });

  record(
    'Company Requirement (>= 8 companies)',
    companyCount >= 8 && uniqueCompanyTags.size >= 8,
    `Company table count: ${companyCount}, Unique JSON company tags in problems: ${uniqueCompanyTags.size} (${Array.from(uniqueCompanyTags).join(', ')})`
  );

  // 1.5 Code Templates Verification (5 languages per problem)
  const requiredLanguages = ['python', 'cpp', 'javascript', 'java', 'go'];
  const templateCountsByLang: Record<string, number> = {};
  for (const lang of requiredLanguages) {
    templateCountsByLang[lang] = await prisma.codeTemplate.count({ where: { language: lang } });
  }

  const allTemplatesPresent = requiredLanguages.every(
    (lang) => templateCountsByLang[lang] >= problemCount
  );
  record(
    'Code Templates Coverage (5 languages x 400 problems)',
    allTemplatesPresent,
    `Counts: ${JSON.stringify(templateCountsByLang)}`
  );

  // 1.6 Difficulty Breakdown
  const easyCount = await prisma.problem.count({ where: { difficulty: 'EASY' } });
  const mediumCount = await prisma.problem.count({ where: { difficulty: 'MEDIUM' } });
  const hardCount = await prisma.problem.count({ where: { difficulty: 'HARD' } });
  record(
    'Difficulty Breakdown',
    easyCount + mediumCount + hardCount === problemCount,
    `EASY: ${easyCount}, MEDIUM: ${mediumCount}, HARD: ${hardCount} (Total: ${easyCount + mediumCount + hardCount})`
  );

  // --- 2. DATA INTEGRITY & EDGE CASES ---
  console.log('\n--- 2. DATA INTEGRITY & STRESS CHECKS ---');

  // 2.1 Unique Slugs & Duplicate IDs
  const slugs = await prisma.problem.findMany({ select: { slug: true, id: true } });
  const uniqueSlugs = new Set(slugs.map((s) => s.slug));
  const uniqueIds = new Set(slugs.map((s) => s.id));

  record(
    'Slug and ID Uniqueness',
    uniqueSlugs.size === problemCount && uniqueIds.size === problemCount,
    `Unique slugs: ${uniqueSlugs.size}/${problemCount}, Unique IDs: ${uniqueIds.size}/${problemCount}`
  );

  // 2.2 Problems Missing Critical Content
  const emptyContentProblems = await prisma.problem.findMany({
    where: {
      OR: [
        { title: '' },
        { statement: '' },
        { inputFormat: '' },
        { outputFormat: '' },
        { constraints: '' },
        { editorial: '' },
      ],
    },
  });

  record(
    'Problem Content Integrity (No empty fields)',
    emptyContentProblems.length === 0,
    `Problems with empty required fields: ${emptyContentProblems.length}`
  );

  // 2.3 Check per-problem test cases & code templates
  const problemsWithRelations = await prisma.problem.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      _count: {
        select: {
          testCases: true,
          codeTemplates: true,
        },
      },
    },
  });

  const problemsWithoutTestCases = problemsWithRelations.filter((p) => p._count.testCases === 0);
  const problemsWithoutTemplates = problemsWithRelations.filter((p) => p._count.codeTemplates < 5);

  record(
    'Per-Problem Test Case Completeness',
    problemsWithoutTestCases.length === 0,
    `Problems missing test cases: ${problemsWithoutTestCases.length}`
  );

  record(
    'Per-Problem Code Template Completeness (>=5 templates)',
    problemsWithoutTemplates.length === 0,
    `Problems missing code templates: ${problemsWithoutTemplates.length}`
  );

  // 2.4 Invalid JSON in topicTags or companyTags
  const allProblemsTags = await prisma.problem.findMany({
    select: { id: true, topicTags: true, companyTags: true },
  });
  let invalidTopicTagCount = 0;
  let invalidCompanyTagCount = 0;

  allProblemsTags.forEach((p) => {
    try {
      const t = JSON.parse(p.topicTags);
      if (!Array.isArray(t)) invalidTopicTagCount++;
    } catch {
      invalidTopicTagCount++;
    }
    try {
      const c = JSON.parse(p.companyTags);
      if (!Array.isArray(c)) invalidCompanyTagCount++;
    } catch {
      invalidCompanyTagCount++;
    }
  });

  record(
    'JSON Tags Integrity (topicTags & companyTags valid JSON arrays)',
    invalidTopicTagCount === 0 && invalidCompanyTagCount === 0,
    `Invalid topic JSONs: ${invalidTopicTagCount}, Invalid company JSONs: ${invalidCompanyTagCount}`
  );

  // 2.5 CompanyProblem Relational Link Integrity
  const companyProblemsCount = await prisma.companyProblem.count();
  record(
    'CompanyProblem Join Table Links',
    companyProblemsCount > 0,
    `Total CompanyProblem relationships linked: ${companyProblemsCount}`
  );

  // --- 3. API ENDPOINT VERIFICATION ---
  console.log('\n--- 3. API ENDPOINT TESTING ---');

  // 3.1 Test /api/problems?limit=50
  try {
    const req = new NextRequest('http://localhost:3000/api/problems?limit=50');
    const res = await getProblems(req);
    const body = await res.json();

    const is200 = res.status === 200;
    const hasArray = Array.isArray(body.problems);
    const correctLimit = body.limit === 50;
    const arrayLen = body.problems.length === 50;
    const totalCorrect = body.total >= 400;
    const totalPagesCorrect = body.totalPages === Math.ceil(body.total / 50);
    const validMeta = body.page === 1;

    // Check problem structure in API response
    const sampleItem = body.problems[0];
    const hasValidFields =
      sampleItem &&
      typeof sampleItem.id === 'string' &&
      typeof sampleItem.slug === 'string' &&
      typeof sampleItem.title === 'string' &&
      Array.isArray(sampleItem.topicTags) &&
      Array.isArray(sampleItem.companyTags);

    record(
      'API Endpoint GET /api/problems?limit=50',
      is200 && hasArray && correctLimit && arrayLen && totalCorrect && totalPagesCorrect && validMeta && hasValidFields,
      `Status: ${res.status}, Returned: ${body.problems?.length} items, Total: ${body.total}, TotalPages: ${body.totalPages}, Sample item fields valid: ${hasValidFields}`
    );
  } catch (err: any) {
    record('API Endpoint GET /api/problems?limit=50', false, `Error calling handler: ${err.message}`);
  }

  // 3.2 Test /api/problems?limit=50&page=2
  try {
    const req = new NextRequest('http://localhost:3000/api/problems?limit=50&page=2');
    const res = await getProblems(req);
    const body = await res.json();

    const isPage2 = body.page === 2;
    const len50 = body.problems.length === 50;

    record(
      'API Pagination Page 2 GET /api/problems?limit=50&page=2',
      res.status === 200 && isPage2 && len50,
      `Page: ${body.page}, Items on page 2: ${body.problems?.length}`
    );
  } catch (err: any) {
    record('API Pagination Page 2', false, `Error: ${err.message}`);
  }

  // 3.3 Test API Filtering by Difficulty (EASY, MEDIUM, HARD)
  try {
    const reqEasy = new NextRequest('http://localhost:3000/api/problems?difficulty=EASY&limit=100');
    const resEasy = await getProblems(reqEasy);
    const bodyEasy = await resEasy.json();

    const reqMed = new NextRequest('http://localhost:3000/api/problems?difficulty=MEDIUM&limit=100');
    const resMed = await getProblems(reqMed);
    const bodyMed = await resMed.json();

    const reqHard = new NextRequest('http://localhost:3000/api/problems?difficulty=HARD&limit=100');
    const resHard = await getProblems(reqHard);
    const bodyHard = await resHard.json();

    const allEasyValid = bodyEasy.problems.every((p: any) => p.difficulty === 'EASY');
    const allMedValid = bodyMed.problems.every((p: any) => p.difficulty === 'MEDIUM');
    const allHardValid = bodyHard.problems.every((p: any) => p.difficulty === 'HARD');

    record(
      'API Difficulty Filtering (EASY, MEDIUM, HARD)',
      resEasy.status === 200 && allEasyValid && allMedValid && allHardValid,
      `EASY total: ${bodyEasy.total}, MEDIUM total: ${bodyMed.total}, HARD total: ${bodyHard.total}`
    );
  } catch (err: any) {
    record('API Difficulty Filtering', false, `Error: ${err.message}`);
  }

  // 3.4 Test API Filtering by Company (e.g. Google)
  try {
    const reqGoogle = new NextRequest('http://localhost:3000/api/problems?company=Google&limit=50');
    const resGoogle = await getProblems(reqGoogle);
    const bodyGoogle = await resGoogle.json();

    const allGoogle = bodyGoogle.problems.every((p: any) => p.companyTags.includes('Google'));
    record(
      'API Company Filtering (company=Google)',
      resGoogle.status === 200 && bodyGoogle.total > 0 && allGoogle,
      `Google total problems: ${bodyGoogle.total}, page 1 returned: ${bodyGoogle.problems.length}`
    );
  } catch (err: any) {
    record('API Company Filtering', false, `Error: ${err.message}`);
  }

  // 3.5 Test API Search Filter (e.g. search=Sum)
  try {
    const reqSearch = new NextRequest('http://localhost:3000/api/problems?search=Sum&limit=50');
    const resSearch = await getProblems(reqSearch);
    const bodySearch = await resSearch.json();

    record(
      'API Search Query (search=Sum)',
      resSearch.status === 200 && bodySearch.total > 0,
      `Matches for "Sum": ${bodySearch.total}`
    );
  } catch (err: any) {
    record('API Search Query', false, `Error: ${err.message}`);
  }

  // 3.6 Test Edge Cases / Input Bounds on API
  try {
    // Negative page / invalid limit capped at 100
    const reqBounds = new NextRequest('http://localhost:3000/api/problems?page=-5&limit=500');
    const resBounds = await getProblems(reqBounds);
    const bodyBounds = await resBounds.json();

    record(
      'API Limit & Page Bounds Normalization (page=-5 -> 1, limit=500 -> 100)',
      resBounds.status === 200 && bodyBounds.page === 1 && bodyBounds.limit === 100,
      `Normalized Page: ${bodyBounds.page}, Normalized Limit: ${bodyBounds.limit}`
    );
  } catch (err: any) {
    record('API Limit & Page Bounds Normalization', false, `Error: ${err.message}`);
  }

  // 3.7 Test Fetch Single Problem Detail endpoint GET /api/problems/[id]
  try {
    const sampleProb = await prisma.problem.findFirst();
    if (sampleProb) {
      const reqId = new NextRequest(`http://localhost:3000/api/problems/${sampleProb.id}`);
      const resId = await getProblemById(reqId, { params: Promise.resolve({ id: sampleProb.id }) });
      const bodyId = await resId.json();

      const reqSlug = new NextRequest(`http://localhost:3000/api/problems/${sampleProb.slug}`);
      const resSlug = await getProblemById(reqSlug, { params: Promise.resolve({ id: sampleProb.slug }) });
      const bodySlug = await resSlug.json();

      const validDetail =
        bodyId.id === sampleProb.id &&
        bodySlug.slug === sampleProb.slug &&
        Array.isArray(bodyId.testCases) &&
        Array.isArray(bodyId.codeTemplates);

      record(
        'API Single Problem Fetch by ID & Slug (/api/problems/[id])',
        resId.status === 200 && resSlug.status === 200 && validDetail,
        `Problem: "${bodyId.title}", TestCases returned: ${bodyId.testCases.length}, CodeTemplates returned: ${bodyId.codeTemplates.length}`
      );
    }
  } catch (err: any) {
    record('API Single Problem Fetch', false, `Error: ${err.message}`);
  }

  // --- SUMMARY ---
  console.log('\n====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalTests = results.length;
  console.log(`SUMMARY: ${passedCount}/${totalTests} Passed.`);
  console.log('====================================================\n');

  if (passedCount < totalTests) {
    process.exitCode = 1;
  }
}

runEmpiricalTests()
  .catch((err) => {
    console.error('Fatal error during empirical testing:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
