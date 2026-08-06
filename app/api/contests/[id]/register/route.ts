import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limitResponse = rateLimitResponse(
      req,
      'contest:register',
      12,
      60 * 1000,
      'Contest registration rate limit reached. Please try again shortly.',
    );
    if (limitResponse) return limitResponse;

    const { id: contestId } = await params;
    const session = getSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Sign in to register for contests.' }, { status: 401 });
    }
    const userId = session.userId;

    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }
    if (new Date() > contest.endTime) {
      return NextResponse.json({ error: 'This contest has already ended.' }, { status: 409 });
    }

    // Check if participant already exists
    const existingParticipant = await prisma.contestParticipant.findFirst({
      where: {
        contestId: contest.id,
        userId: userId,
      },
    });

    if (existingParticipant) {
      return NextResponse.json({
        message: 'Already registered for this contest',
        participant: existingParticipant,
        registered: true,
      });
    }

    const userRating = 0;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    let participant;
    try {
      participant = await prisma.contestParticipant.create({
        data: {
          contestId: contest.id,
          userId: userId,
          name: user?.name || session.name,
          oldRating: userRating,
          newRating: userRating,
          score: 0,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrentParticipant = await prisma.contestParticipant.findFirst({
          where: { contestId: contest.id, userId },
        });
        if (concurrentParticipant) {
          return NextResponse.json({
            message: 'Already registered for this contest',
            participant: concurrentParticipant,
            registered: true,
          });
        }
      }
      throw error;
    }

    return NextResponse.json({
      message: 'Successfully registered for contest',
      participant,
      registered: true,
    });
  } catch (error: unknown) {
    console.error('Error in /api/contests/[id]/register:', error);
    return NextResponse.json(
      { error: 'Failed to register for contest' },
      { status: 500 }
    );
  }
}
