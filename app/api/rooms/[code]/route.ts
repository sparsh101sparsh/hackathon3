import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const limitResponse = rateLimitResponse(req, 'room:read', 40, 60 * 1000, 'Battle room polling is temporarily rate limited. Please try again shortly.');
    if (limitResponse) return limitResponse;

    const session = getSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Sign in to view a battle room.' }, { status: 401 });
    }
    const { code: rawCode } = await params;
    const code = rawCode.trim().toUpperCase();

    const room = await prisma.customRoom.findUnique({
      where: { code },
      include: {
        participants: {
          orderBy: [{ score: 'desc' }, { solved: 'desc' }, { joinedAt: 'asc' }],
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (!room.participants.some((participant) => participant.userId === session.userId)) {
      return NextResponse.json({ error: 'Join this battle room before viewing its contents.' }, { status: 403 });
    }

    if (room.status === 'IN_PROGRESS' && room.startedAt) {
      const deadline = room.startedAt.getTime() + room.durationSeconds * 1000;
      if (Date.now() >= deadline) {
        await prisma.customRoom.updateMany({
          where: { id: room.id, status: 'IN_PROGRESS' },
          data: { status: 'FINISHED', endedAt: new Date() },
        });
        room.status = 'FINISHED';
        room.endedAt = new Date();
      }
    }

    const problemIds: string[] = JSON.parse(room.problemIds || '[]');
    const problems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        statement: true,
        constraints: true,
        inputFormat: true,
        outputFormat: true,
        topicTags: true,
        testCases: {
          where: { isSample: true },
          select: { id: true, input: true, expectedOutput: true, isSample: true },
        },
        codeTemplates: true,
      },
    });

    return NextResponse.json({
      room,
      problems,
    });
  } catch (error: unknown) {
    console.error('Error fetching custom room:', error);
    return NextResponse.json({ error: 'Failed to fetch battle room' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const limitResponse = rateLimitResponse(req, 'room:mutate', 60, 60 * 1000, 'Too many battle room updates. Please try again shortly.');
    if (limitResponse) return limitResponse;

    const { code: rawCode } = await params;
    const code = rawCode.trim().toUpperCase();
    const body = await req.json();
    const { action, pointsToAdd = 100, progress = 'CODING', problemId } = body;
    const session = getSessionFromRequest(req);
    const userId = session?.userId;
    if (!userId) return NextResponse.json({ error: 'Sign in to use battle rooms.' }, { status: 401 });

    const room = await prisma.customRoom.findUnique({
      where: { code },
      include: { participants: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const currentParticipant = room.participants.find((participant) => participant.userId === userId);
    const hostParticipant = [...room.participants].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
    const isHost = currentParticipant?.userId === hostParticipant?.userId;

    if (action === 'START_BATTLE') {
      if (!currentParticipant) {
        return NextResponse.json({ error: 'Join the room before starting the battle.' }, { status: 403 });
      }
      if (!isHost) {
        return NextResponse.json({ error: 'Only the room host can start the battle.' }, { status: 403 });
      }
      if (room.status !== 'WAITING') {
        return NextResponse.json({ error: 'This battle has already started.' }, { status: 409 });
      }
      if (room.mode === 'DUEL' && room.participants.length < 2) {
        return NextResponse.json({ error: 'A duel starts when both coders are in the room.' }, { status: 400 });
      }
      const updated = await prisma.customRoom.update({
        where: { id: room.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), endedAt: null, winnerId: null },
        include: { participants: { orderBy: { score: 'desc' } } },
      });
      return NextResponse.json({ success: true, room: updated, deadline: updated.startedAt ? updated.startedAt.getTime() + updated.durationSeconds * 1000 : null });
    }

    if (action === 'LEAVE_ROOM') {
      const participant = await prisma.roomParticipant.findUnique({
        where: { roomId_userId: { roomId: room.id, userId } },
      });

      if (participant) {
        await prisma.roomParticipant.delete({
          where: { id: participant.id },
        });
      }

      const remaining = room.participants.filter((p) => p.userId !== userId);
      if (remaining.length === 0) {
        // Delete room if no participants left
        await prisma.customRoom.delete({ where: { id: room.id } });
      } else if (isHost) {
        // Reassign host
        const nextHost = [...remaining].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
        await prisma.customRoom.update({
          where: { id: room.id },
          data: { hostName: nextHost.userName },
        });
      }

      return NextResponse.json({ success: true, left: true });
    }

    if (action === 'CLOSE_ROOM') {
      if (!currentParticipant) {
        return NextResponse.json({ error: 'Join the room before closing the room.' }, { status: 403 });
      }
      if (!isHost) {
        return NextResponse.json({ error: 'Only the room host can close the room.' }, { status: 403 });
      }
      if (room.status === 'WAITING') {
        await prisma.customRoom.delete({ where: { id: room.id } });
        return NextResponse.json({ success: true, closed: true, deleted: true });
      } else {
        const updated = await prisma.customRoom.update({
          where: { id: room.id },
          data: { status: 'FINISHED', endedAt: new Date() },
          include: { participants: true },
        });
        return NextResponse.json({ success: true, closed: true, room: updated });
      }
    }

    if (action === 'UPDATE_PROGRESS') {
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
      const allowed = ['WAITING', 'CODING', 'SUBMITTED', 'SOLVED'];
      const nextProgress = allowed.includes(progress) ? progress : 'CODING';
      const participant = await prisma.roomParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });
      if (!participant) return NextResponse.json({ error: 'Join the room before updating progress.' }, { status: 403 });
      const updated = await prisma.roomParticipant.update({
        where: { id: participant.id },
        data: { progress: nextProgress },
      });
      return NextResponse.json({ success: true, participant: updated });
    }

    if (action === 'SCORE_POINTS') {
      if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
      }

      const participant = await prisma.roomParticipant.findUnique({ where: { roomId_userId: { roomId: room.id, userId } } });

      if (!participant) {
        return NextResponse.json({ error: 'Join the room before submitting a battle result.' }, { status: 403 });
      } else {
        if (typeof problemId !== 'string') {
          return NextResponse.json({ error: 'problemId is required when recording a battle result.' }, { status: 400 });
        }
        let roomProblemIds: string[] = [];
        try {
          const parsedProblemIds = JSON.parse(room.problemIds || '[]');
          roomProblemIds = Array.isArray(parsedProblemIds) ? parsedProblemIds.map(String) : [];
        } catch {
          return NextResponse.json({ error: 'Battle problem configuration is invalid.' }, { status: 500 });
        }
        if (!roomProblemIds.includes(problemId)) {
          return NextResponse.json({ error: 'That problem is not part of this battle room.' }, { status: 400 });
        }
        if (room.status !== 'IN_PROGRESS') {
          return NextResponse.json({ success: false, finished: true, room }, { status: 409 });
        }
        if (participant.acceptedAt) {
          return NextResponse.json({ error: 'This participant has already recorded a battle solve.' }, { status: 409 });
        }
        if (room.startedAt && Date.now() >= room.startedAt.getTime() + room.durationSeconds * 1000) {
          const finishedRoom = await prisma.customRoom.update({
            where: { id: room.id },
            data: { status: 'FINISHED', endedAt: new Date() },
            include: { participants: true },
          });
          return NextResponse.json({ success: false, finished: true, room: finishedRoom }, { status: 409 });
        }
        const acceptedSubmission = await prisma.submission.findFirst({
          where: {
            userId,
            problemId,
            status: 'Accepted',
            createdAt: { gte: room.startedAt || room.createdAt },
          },
          select: { id: true },
        });
        if (!acceptedSubmission) {
          return NextResponse.json({ error: 'Submit an accepted solution before recording battle points.' }, { status: 403 });
        }
        const requestedPoints = Number(pointsToAdd);
        const awardedPoints = requestedPoints === 150 ? 150 : 100;
        await prisma.$transaction(async (tx) => {
          const currentRoom = await tx.customRoom.findUnique({ where: { id: room.id }, include: { participants: true } });
          if (!currentRoom || currentRoom.status !== 'IN_PROGRESS') return;
          const currentParticipant = currentRoom.participants.find((item) => item.userId === userId);
          if (!currentParticipant || currentParticipant.acceptedAt) return;
          const acceptedAt = new Date();
          await tx.roomParticipant.update({
            where: { id: currentParticipant.id },
            data: { score: currentParticipant.score + awardedPoints, solved: currentParticipant.solved + 1, progress: 'SOLVED', acceptedAt },
          });
          if (currentRoom.mode === 'DUEL') {
            await tx.customRoom.update({ where: { id: currentRoom.id }, data: { status: 'FINISHED', endedAt: acceptedAt, winnerId: currentParticipant.userId } });
          }
        });
      }

      const updatedRoom = await prisma.customRoom.findUnique({
        where: { id: room.id },
        include: {
          participants: {
            orderBy: [{ score: 'desc' }, { solved: 'desc' }],
          },
        },
      });

      return NextResponse.json({ success: true, room: updatedRoom, finished: updatedRoom?.status === 'FINISHED', winnerId: updatedRoom?.winnerId || null });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Error updating battle room:', error);
    return NextResponse.json({ error: 'Failed to update battle room' }, { status: 500 });
  }
}
