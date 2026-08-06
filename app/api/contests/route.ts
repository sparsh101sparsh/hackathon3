import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const session = getSessionFromRequest(req);

    const contestSummarySelect = {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      isRated: true,
      status: true,
      _count: {
        select: {
          contestProblems: true,
          contestParticipants: true,
        },
      },
    } as const;

    let dbContests = await prisma.contest.findMany({
      orderBy: { startTime: 'desc' },
      select: contestSummarySelect,
    });

    if (dbContests.length === 0) {
      const activeStart = new Date(now.getTime() - 45 * 60 * 1000);
      const activeEnd = new Date(now.getTime() + 75 * 60 * 1000);

      const upcomingStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const upcomingEnd = new Date(upcomingStart.getTime() + 2 * 60 * 60 * 1000);

      const pastStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(pastStart.getTime() + 2 * 60 * 60 * 1000);

      await prisma.contest.createMany({
        data: [
          {
            title: 'CodeForge Live Weekly 42',
            description: 'Compete live with top global algorithms engineers! Solve 4 DSA problems with points 100, 250, 500, 1000.',
            startTime: activeStart,
            endTime: activeEnd,
            isRated: true,
            status: 'ACTIVE',
          },
          {
            title: 'CodeForge Grand Master Challenge 15',
            description: 'Rated contest designed for intermediate to advance competitive programmers.',
            startTime: upcomingStart,
            endTime: upcomingEnd,
            isRated: true,
            status: 'UPCOMING',
          },
          {
            title: 'CodeForge Spring Championship 2026',
            description: 'Completed rated contest. Review problem set and editorial solutions.',
            startTime: pastStart,
            endTime: pastEnd,
            isRated: true,
            status: 'ENDED',
          },
        ],
      });

      dbContests = await prisma.contest.findMany({
        orderBy: { startTime: 'desc' },
        select: contestSummarySelect,
      });
    }

    const registeredContestIds = new Set<string>();
    if (session?.userId && dbContests.length > 0) {
      const registrations = await prisma.contestParticipant.findMany({
        where: {
          userId: session.userId,
          contestId: { in: dbContests.map((contest) => contest.id) },
        },
        select: { contestId: true },
      });
      for (const registration of registrations) {
        registeredContestIds.add(registration.contestId);
      }
    }

    const contests = dbContests.map((c) => {
      let calculatedStatus = c.status;
      if (now >= new Date(c.startTime) && now <= new Date(c.endTime)) {
        calculatedStatus = 'ACTIVE';
      } else if (now < new Date(c.startTime)) {
        calculatedStatus = 'UPCOMING';
      } else if (now > new Date(c.endTime)) {
        calculatedStatus = 'ENDED';
      }

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        startTime: c.startTime,
        endTime: c.endTime,
        isRated: c.isRated,
        status: calculatedStatus,
        problemCount: c._count.contestProblems || 4,
        participantCount: c._count.contestParticipants,
        isRegistered: registeredContestIds.has(c.id),
      };
    });

    return NextResponse.json({ contests });
  } catch (error: unknown) {
    console.error('Error in /api/contests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contests' },
      { status: 500 }
    );
  }
}
