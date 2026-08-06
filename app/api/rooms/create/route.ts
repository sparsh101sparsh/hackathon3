import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getSessionFromRequest } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'BATTLE-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(crypto.randomInt(chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(req, 'room:create', 8, 60 * 1000, 'Too many room creation requests. Please try again shortly.');
    if (limitResponse) return limitResponse;

    const payload = getSessionFromRequest(req);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Sign in to create a battle room.' }, { status: 401 });
    }

    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid battle room request' }, { status: 400 });
    }
    const { name, hostName, difficulty = 'MIXED', problemCount = 1, mode = 'DUEL', durationSeconds = 900 } = body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length > 120)) {
      return NextResponse.json({ error: 'Room name must be a text value of at most 120 characters' }, { status: 400 });
    }
    const normalizedDifficulty = typeof difficulty === 'string' ? difficulty.toUpperCase() : '';
    if (!['EASY', 'MEDIUM', 'HARD', 'MIXED'].includes(normalizedDifficulty)) {
      return NextResponse.json({ error: 'Invalid battle difficulty' }, { status: 400 });
    }
    const requestedMode = typeof mode === 'string' ? mode.toUpperCase() : 'DUEL';
    const battleMode = requestedMode === 'SQUAD' || requestedMode.startsWith('BLITZ_') ? 'SQUAD' : 'DUEL';
    const requestedProblemCount = battleMode === 'DUEL' ? 1 : Math.max(1, Math.min(5, Number(problemCount) || 3));

    const userId = payload.userId;
    const finalHostName = payload.name;

    // Pick random problems based on difficulty
    let problemWhere: Prisma.ProblemWhereInput = {};
    if (normalizedDifficulty === 'EASY') problemWhere.difficulty = 'EASY';
    else if (normalizedDifficulty === 'MEDIUM') problemWhere.difficulty = 'MEDIUM';
    else if (normalizedDifficulty === 'HARD') problemWhere.difficulty = 'HARD';

    const availableProblems = await prisma.problem.findMany({
      where: problemWhere,
      select: { id: true },
      take: 100,
    });

    if (availableProblems.length === 0) {
      return NextResponse.json({ error: 'No problems found for selected difficulty' }, { status: 400 });
    }

    // Fisher-Yates with crypto randomness keeps problem selection unbiased.
    const shuffled = [...availableProblems];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = crypto.randomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedProblemIds = shuffled.slice(0, Math.min(requestedProblemCount, availableProblems.length)).map(p => p.id);

    let roomCode = generateRoomCode();
    let existing = await prisma.customRoom.findUnique({ where: { code: roomCode } });
    while (existing) {
      roomCode = generateRoomCode();
      existing = await prisma.customRoom.findUnique({ where: { code: roomCode } });
    }

    const isAiDuel = Boolean(body.addAiBot || body.isAiDuel || requestedMode === 'AI_DUEL');
    const initialParticipants: Array<{ userId: string; userName: string; score: number; solved: number }> = [
      {
        userId,
        userName: finalHostName,
        score: 0,
        solved: 0,
      },
    ];
    if (isAiDuel) {
      initialParticipants.push({
        userId: 'ai_bot_challenger',
        userName: 'Grandmaster',
        score: 0,
        solved: 0,
      });
    }

    const room = await prisma.customRoom.create({
      data: {
        code: roomCode,
        name: name || `${finalHostName}'s Battle Arena`,
        hostName: finalHostName,
        maxPlayers: 10,
        difficulty: normalizedDifficulty,
        problemCount: selectedProblemIds.length,
        status: 'WAITING',
        problemIds: JSON.stringify(selectedProblemIds),
        mode: battleMode,
        durationSeconds: battleMode === 'DUEL' ? 900 : Math.max(300, Math.min(3600, Number(durationSeconds) || 900)),
        participants: {
          create: initialParticipants,
        },
      },
      include: {
        participants: true,
      },
    });

    return NextResponse.json({
      success: true,
      roomCode: room.code,
      participantUserId: userId,
      room,
    });
  } catch (error: unknown) {
    console.error('Error creating custom battle room:', error);
    return NextResponse.json({ error: 'Failed to create battle room' }, { status: 500 });
  }
}
