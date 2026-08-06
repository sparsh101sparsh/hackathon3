import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTtlCached } from '@/lib/ttlCache';

export const dynamic = 'force-dynamic';

export interface CompanyProblemItem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  frequencyTag: 'High' | 'Medium' | 'Low';
  frequencyScore: number; // 1-100
  acceptanceRate: number;
  topicTags: string[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const slugName = slug.toLowerCase();
    const companyName = slugName.charAt(0).toUpperCase() + slugName.slice(1);

    const data = await getTtlCached(`public:company:${slugName}:v2`, 30_000, async () => {
      // Find matching company in DB
      const dbCompany = await prisma.company.findFirst({
        where: {
          name: {
            equals: companyName,
          },
        },
        include: {
          companyProblems: {
            include: {
              problem: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  difficulty: true,
                  topicTags: true,
                },
              },
            },
            orderBy: {
              frequency: 'desc',
            },
          },
        },
      });

    // Also query problems that mention this company tag in problem.companyTags
      const taggedProblems = await prisma.problem.findMany({
        where: {
          companyTags: {
            contains: companyName,
          },
        },
        take: 20,
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          topicTags: true,
        },
      });

      const sourceProblems = dbCompany && dbCompany.companyProblems.length > 0
        ? dbCompany.companyProblems.map((companyProblem) => ({
            problem: companyProblem.problem,
            frequency: companyProblem.frequency,
          }))
        : taggedProblems.map((problem) => ({ problem, frequency: 1 }));

      if (sourceProblems.length === 0) return null;

      const problemIds = sourceProblems.map(({ problem }) => problem.id);
      const submissionGroups = await prisma.submission.groupBy({
        by: ['problemId', 'status'],
        where: { problemId: { in: problemIds } },
        _count: { _all: true },
      });
      const submissionStats = new Map<string, { total: number; accepted: number }>();
      for (const group of submissionGroups) {
        const stats = submissionStats.get(group.problemId) || { total: 0, accepted: 0 };
        stats.total += group._count._all;
        if (group.status === 'Accepted') stats.accepted += group._count._all;
        submissionStats.set(group.problemId, stats);
      }

      const problemList: CompanyProblemItem[] = sourceProblems.map(({ problem, frequency }) => {
        let tags: string[] = [];
        try {
          const parsed = JSON.parse(problem.topicTags || '[]');
          tags = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          tags = [];
        }
        const frequencyScore = Math.max(1, Math.min(100, frequency || 1));
        const stats = submissionStats.get(problem.id) || { total: 0, accepted: 0 };
        return {
          id: problem.id,
          slug: problem.slug,
          title: problem.title,
          difficulty: problem.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
          frequencyTag: frequencyScore >= 80 ? 'High' : frequencyScore >= 60 ? 'Medium' : 'Low',
          frequencyScore,
          acceptanceRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 1000) / 10 : 0,
          topicTags: tags,
        };
      });

      return {
        company: {
          id: dbCompany?.id || slugName,
          name: dbCompany?.name || companyName,
          slug: slugName,
          logo: `/companies/${slugName}.svg`,
          description: dbCompany?.description || `${companyName} Top Interview Questions & System Design Prep`,
          problemCount: problemList.length,
        },
        problems: problemList,
      };
    });

    if (!data) return NextResponse.json({ error: 'Company not found or has no mapped problems' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error in /api/company/[slug]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company detail' },
      { status: 500 }
    );
  }
}
