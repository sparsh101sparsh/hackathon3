import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(req, 'room:join', 20, 60 * 1000, 'Too many room join requests. Please try again shortly.');
    if (limitResponse) return limitResponse;

    const payload = getSessionFromRequest(req);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Sign in to join a battle room.' }, { status: 401 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A room code is required' }, { status: 400 });
    }
    const { roomCode } = body as { roomCode?: unknown };

    if (typeof roomCode !== 'string' || !roomCode.trim() || roomCode.length > 32) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
    }

    const cleanCode = roomCode.trim().toUpperCase();

    const room = await prisma.customRoom.findUnique({
      where: { code: cleanCode },
      include: { participants: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Battle room not found. Check the code and try again.' }, { status: 404 });
    }

    const userId = payload.userId;
    const finalUserName = payload.name;

    // Check if user is already in the room
    const alreadyParticipant = room.participants.find(p => p.userId === userId);
    if (alreadyParticipant) {
      return NextResponse.json({ success: true, roomCode: room.code, room });
    }

    // Enforce 10 player max limit
    if (room.participants.length >= 10) {
      return NextResponse.json(
        { error: 'Room is full! Maximum limit of 10 friends has been reached.' },
        { status: 400 }
      );
    }

    // Add user as participant
    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId,
        userName: finalUserName,
        score: 0,
        solved: 0,
      },
    });

    const updatedRoom = await prisma.customRoom.findUnique({
      where: { id: room.id },
      include: { participants: true },
    });

    return NextResponse.json({
      success: true,
      roomCode: room.code,
      participantUserId: userId,
      room: updatedRoom,
    });
  } catch (error: unknown) {
    console.error('Error joining custom room:', error);
    return NextResponse.json({ error: 'Failed to join battle room' }, { status: 500 });
  }
}
