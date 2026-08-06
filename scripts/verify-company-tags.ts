import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { EXPLICIT_COMPANY_MAPPINGS } from './company-mappings';

const prisma = new PrismaClient();

async function getProblemSlugs(): Promise<Map<number, string>> {
  const idToSlug = new Map<number, string>();
  try {
    const res = await fetch('https://leetcode.com/api/problems/all/');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.stat_status_pairs)) {
        const freePairs = data.stat_status_pairs
          .filter((p: any) => !p.paid_only && !p.stat.question__hide)
          .sort((a: any, b: any) => a.stat.frontend_question_id - b.stat.frontend_question_id)
          .slice(0, 400);

        for (const pair of freePairs) {
          idToSlug.set(pair.stat.frontend_question_id, pair.stat.question__title_slug);
        }
      }
    }
  } catch (err) {
    // ignore
  }

  if (idToSlug.size < 400) {
    const datasetPath = path.join(process.cwd(), 'prisma', 'seedData', 'leetcode400.json');
    if (fs.existsSync(datasetPath)) {
      const datasetItems: Array<{ frontendId: number; slug: string }> = JSON.parse(
        fs.readFileSync(datasetPath, 'utf-8')
      );
      datasetItems.forEach((item) => {
        if (!idToSlug.has(item.frontendId)) {
          idToSlug.set(item.frontendId, item.slug);
        }
      });
    }
  }

  return idToSlug;
}

async function verify() {
  console.log('🔍 Running Database Company Tags Verification...\n');

  const idToSlug = await getProblemSlugs();

  const totalProblems = await prisma.problem.count();
  console.log(`📊 Total problems in DB: ${totalProblems}`);

  if (totalProblems < 400) {
    console.error(`❌ Verification failed: Total problems (${totalProblems}) < 400`);
    process.exit(1);
  }

  let totalExplicitRequired = 0;
  let totalExplicitPassed = 0;

  for (const [companyName, problemIds] of Object.entries(EXPLICIT_COMPANY_MAPPINGS)) {
    const company = await prisma.company.findUnique({
      where: { name: companyName },
    });

    if (!company) {
      console.error(`❌ Verification failed: Company '${companyName}' not found in DB`);
      process.exit(1);
    }

    for (const frontendId of problemIds) {
      totalExplicitRequired++;
      const slug = idToSlug.get(frontendId);
      if (!slug) {
        console.error(`❌ FrontendId ${frontendId} not found in problem mapping`);
        process.exit(1);
      }

      const problem = await prisma.problem.findUnique({
        where: { slug },
      });

      if (!problem) {
        console.error(`❌ Problem slug '${slug}' (frontendId: ${frontendId}) not found in DB`);
        process.exit(1);
      }

      const tags: string[] = JSON.parse(problem.companyTags);
      const hasTag = tags.includes(companyName);

      const relation = await prisma.companyProblem.findFirst({
        where: {
          companyId: company.id,
          problemId: problem.id,
        },
      });

      if (hasTag && relation) {
        totalExplicitPassed++;
      } else {
        console.error(
          `❌ Verification failed for ${companyName} -> frontendId ${frontendId} (${slug}): tagInDb=${hasTag}, relationInDb=${!!relation}`
        );
      }
    }
  }

  console.log(`✅ Explicit company mapping verification: ${totalExplicitPassed}/${totalExplicitRequired} passed.`);

  // Verify company.problemCount
  const companies = await prisma.company.findMany();
  let companyCountsValid = true;

  for (const comp of companies) {
    const actualLinks = await prisma.companyProblem.count({
      where: { companyId: comp.id },
    });
    if (comp.problemCount !== actualLinks) {
      console.error(
        `❌ Mismatch for company ${comp.name}: problemCount field is ${comp.problemCount}, actual links in CompanyProblem table is ${actualLinks}`
      );
      companyCountsValid = false;
    } else {
      console.log(`  - Company '${comp.name}': ${comp.problemCount} linked problems (verified)`);
    }
  }

  // Verify all problems have company tags
  const problemsWithoutCompany = await prisma.problem.findMany({
    where: { companyTags: '[]' },
  });
  if (problemsWithoutCompany.length > 0) {
    console.error(`❌ Verification failed: ${problemsWithoutCompany.length} problems have empty companyTags`);
    process.exit(1);
  }

  if (totalExplicitPassed === totalExplicitRequired && companyCountsValid) {
    console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n❌ VERIFICATION FAILED!');
    process.exit(1);
  }
}

verify()
  .catch((e) => {
    console.error('Fatal error during verification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
