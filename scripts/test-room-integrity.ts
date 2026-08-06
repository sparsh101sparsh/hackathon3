import { NextRequest } from 'next/server';
import { POST as roomHandler } from '../app/api/rooms/[code]/route';
import { hashPassword, signToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

async function runTest() {
  const timestamp = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `room-integrity-${timestamp}@codeforge.dev`,
      name: 'Room Integrity Test User',
      passwordHash: hashPassword('RoomPass123!'),
    },
  });
  const problem = await prisma.problem.findFirst({ where: { title: 'Two Sum' }, select: { id: true } });
  if (!problem) throw new Error('Two Sum problem is required for room integrity verification');

  const room = await prisma.customRoom.create({
    data: {
      code: `BATTLE-TEST${timestamp.toString().slice(-4)}`,
      name: 'Room Integrity Verification',
      hostName: user.name,
      maxPlayers: 10,
      difficulty: 'MIXED',
      problemCount: 1,
      status: 'WAITING',
      problemIds: JSON.stringify([problem.id]),
      mode: 'SQUAD',
      durationSeconds: 900,
      participants: { create: { userId: user.id, userName: user.name } },
    },
  });
  const token = signToken({ id: user.id, email: user.email, name: user.name, role: user.role });
  const headers = { Cookie: `codeforge_session=${token}`, 'Content-Type': 'application/json' };

  function request(body: object) {
    return new NextRequest(`http://localhost:3000/api/rooms/${room.code}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  }

  try {
    const startResponse = await roomHandler(request({ action: 'START_BATTLE' }), { params: Promise.resolve({ code: room.code }) });
    if (startResponse.status !== 200) throw new Error(`Could not start test room: ${startResponse.status}`);

    const unearnedResponse = await roomHandler(request({ action: 'SCORE_POINTS', problemId: problem.id, pointsToAdd: 150 }), { params: Promise.resolve({ code: room.code }) });
    if (unearnedResponse.status !== 403) throw new Error(`Unearned score returned ${unearnedResponse.status}`);
    console.log('  ✓ PASSED: Room scoring rejects client-only point claims');

    await prisma.submission.create({
      data: {
        userId: user.id,
        problemId: problem.id,
        code: 'verified accepted submission',
        language: 'python',
        status: 'Accepted',
      },
    });
    const earnedResponse = await roomHandler(request({ action: 'SCORE_POINTS', problemId: problem.id, pointsToAdd: 150 }), { params: Promise.resolve({ code: room.code }) });
    const earnedData = await earnedResponse.json();
    if (earnedResponse.status !== 200 || earnedData.room?.participants?.[0]?.score !== 150) {
      throw new Error(`Earned score response was invalid: ${earnedResponse.status}`);
    }
    console.log('  ✓ PASSED: Room scoring awards points only after persisted acceptance');

    const replayResponse = await roomHandler(request({ action: 'SCORE_POINTS', problemId: problem.id, pointsToAdd: 150 }), { params: Promise.resolve({ code: room.code }) });
    if (replayResponse.status !== 409) throw new Error(`Replay score returned ${replayResponse.status}`);
    console.log('  ✓ PASSED: Room scoring cannot be replayed for extra points');
  } finally {
    await prisma.submission.deleteMany({ where: { userId: user.id } });
    await prisma.customRoom.delete({ where: { id: room.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

runTest().catch((error) => {
  console.error('Room integrity verification failed:', error);
  process.exit(1);
});
