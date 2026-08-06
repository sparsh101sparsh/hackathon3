import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const [totalUsers, totalProblems, totalSubmissions, totalContests] =
      await prisma.$transaction([
        prisma.user.count(),
        prisma.problem.count(),
        prisma.submission.count(),
        prisma.contest.count(),
      ]);

    return NextResponse.json({
      totalUsers,
      totalProblems,
      totalSubmissions,
      totalContests,
    });
  } catch (error: unknown) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
