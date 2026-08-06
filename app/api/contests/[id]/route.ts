import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { ensureContestProblemLinks } from '@/lib/contestProblems';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = getSessionFromRequest(req);

    let contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        contestProblems: {
          orderBy: { order: 'asc' },
          include: {
            problem: {
              select: {
                id: true,
                slug: true,
                title: true,
                difficulty: true,
                topicTags: true,
                timeLimit: true,
                memoryLimit: true,
                statement: true,
                inputFormat: true,
                outputFormat: true,
                constraints: true,
              },
            },
          },
        },
        contestParticipants: { select: { userId: true } },
      },
    });

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    await ensureContestProblemLinks(contest.id);
    contest = await prisma.contest.findUnique({
      where: { id: contest.id },
      include: {
        contestProblems: {
          orderBy: { order: 'asc' },
          include: {
            problem: {
              select: {
                id: true,
                slug: true,
                title: true,
                difficulty: true,
                topicTags: true,
                timeLimit: true,
                memoryLimit: true,
                statement: true,
                inputFormat: true,
                outputFormat: true,
                constraints: true,
              },
            },
          },
        },
        contestParticipants: { select: { userId: true } },
      },
    });

    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 });

    const now = new Date();
    let calculatedStatus = contest.status;
    if (now >= new Date(contest.startTime) && now <= new Date(contest.endTime)) {
      calculatedStatus = 'ACTIVE';
    } else if (now < new Date(contest.startTime)) {
      calculatedStatus = 'UPCOMING';
    } else if (now > new Date(contest.endTime)) {
      calculatedStatus = 'ENDED';
    }

    const isRegistered = session?.userId
      ? contest.contestParticipants.some((p) => p.userId === session.userId)
      : false;

    let problems = contest.contestProblems.map((cp, idx) => {
      const pointValues = [100, 250, 500, 1000];
      return {
        id: cp.problem.id,
        contestProblemId: cp.id,
        slug: cp.problem.slug,
        title: cp.problem.title,
        difficulty: cp.problem.difficulty,
        points: cp.points || pointValues[idx % 4],
        order: cp.order || idx + 1,
        statement: cp.problem.statement,
        inputFormat: cp.problem.inputFormat,
        outputFormat: cp.problem.outputFormat,
        constraints: cp.problem.constraints,
        topicTags: JSON.parse(cp.problem.topicTags || '[]'),
      };
    });

    if (problems.length === 0) {
      const sampleDbProblems = await prisma.problem.findMany({ take: 4 });
      const pointValues = [100, 250, 500, 1000];
      problems = sampleDbProblems.map((p, idx) => ({
        id: p.id,
        contestProblemId: `cp-${p.id}`,
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        points: pointValues[idx % 4],
        order: idx + 1,
        statement: p.statement,
        inputFormat: p.inputFormat,
        outputFormat: p.outputFormat,
        constraints: p.constraints,
        topicTags: JSON.parse(p.topicTags || '[]'),
      }));
    }

    const durationSeconds = Math.max(
      0,
      Math.floor((new Date(contest.endTime).getTime() - new Date(contest.startTime).getTime()) / 1000)
    );
    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(contest.endTime).getTime() - now.getTime()) / 1000)
    );

    return NextResponse.json({
      contest: {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        startTime: contest.startTime,
        endTime: contest.endTime,
        isRated: contest.isRated,
        status: calculatedStatus,
        durationSeconds,
        remainingSeconds,
        participantCount: contest.contestParticipants.length,
        isRegistered,
        problems,
      },
    });
  } catch (error: unknown) {
    console.error('Error in /api/contests/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contest detail' },
      { status: 500 }
    );
  }
}
