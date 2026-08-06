import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const submissionCounts = await prisma.submission.groupBy({
      by: ['userId'],
      _count: { _all: true },
    });
    const submissionCountByUser = new Map(
      submissionCounts.map((entry) => [entry.userId || 'guest', entry._count._all]),
    );

    const formattedUsers = users.map((user) => ({
      ...user,
      role: user.role === 'USER' ? 'REGISTERED' : user.role,
      rating: 0,
      avatar: null,
      _count: { submissions: submissionCountByUser.get(user.id) || 0 },
    }));

    return NextResponse.json(formattedUsers);
  } catch (error: unknown) {
    console.error('Error fetching admin users list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
