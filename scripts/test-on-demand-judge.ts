process.env.FREEMODEL_API_KEY = '';

import { PrismaClient } from '@prisma/client';
import { POST as judgePost } from '../app/api/ai/judge/route';
import { POST as createRoomPost } from '../app/api/rooms/create/route';
import { GET as getRoomByCode } from '../app/api/rooms/[code]/route';
import { signToken } from '../lib/auth';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

function record(category: string, name: string, passed: boolean, details: string, data?: any) {
  results.push({ category, name, passed, details, data });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${category}] ${icon}: ${name} - ${details}`);
}

async function getOrCreateTestUser() {
  const email = 'challenger_m2_3_tester@example.com';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Empirical Tester',
        passwordHash: 'dummy_hash',
        role: 'USER',
      },
    });
  }
  return user;
}

function createJsonRequest(url: string, body: any, token?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function runEmpiricalTests() {
  console.log('================================================================');
  console.log('  EMPIRICAL CHALLENGER: MILESTONE 2 & 3 (ON-DEMAND & JUDGE) ');
  console.log('================================================================\n');

  // --- SECTION 1: JUDGE API (/api/ai/judge) ---
  console.log('--- 1. EMPIRICAL TESTING OF /api/ai/judge ---');

  // 1.1 Time Complexity Analysis - O(N^2)
  try {
    const codeO_N2 = `
      function twoSum(nums, target) {
        for (let i = 0; i < nums.length; i++) {
          for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) return [i, j];
          }
        }
        return [];
      }
    `;
    const req = createJsonRequest('http://localhost:3000/api/ai/judge', {
      code: codeO_N2,
      language: 'javascript',
      problemTitle: 'Two Sum',
    });
    const res = await judgePost(req);
    const body = await res.json();

    const passed = body.success && body.report.timeComplexity === 'O(N^2)';
    record(
      'Judge',
      'Time Complexity O(N^2) Pattern Match',
      passed,
      `Returned timeComplexity: ${body.report?.timeComplexity}, efficiencyScore: ${body.report?.efficiencyScore}`
    );
  } catch (err: any) {
    record('Judge', 'Time Complexity O(N^2) Pattern Match', false, `Error: ${err.message}`);
  }

  // 1.2 Time Complexity Analysis - O(N log N)
  try {
    const codeO_NlogN = `
      function sortArray(nums) {
        return nums.sort((a, b) => a - b);
      }
    `;
    const req = createJsonRequest('http://localhost:3000/api/ai/judge', {
      code: codeO_NlogN,
      language: 'javascript',
      problemTitle: 'Sort An Array',
    });
    const res = await judgePost(req);
    const body = await res.json();

    const passed = body.success && body.report.timeComplexity === 'O(N log N)';
    record(
      'Judge',
      'Time Complexity O(N log N) Pattern Match',
      passed,
      `Returned timeComplexity: ${body.report?.timeComplexity}, score: ${body.report?.overallScore}`
    );
  } catch (err: any) {
    record('Judge', 'Time Complexity O(N log N) Pattern Match', false, `Error: ${err.message}`);
  }

  // 1.3 Time Complexity Analysis - O(1)
  try {
    const codeO_1 = `
      function addTwoNumbers(a, b) {
        return a + b;
      }
    `;
    const req = createJsonRequest('http://localhost:3000/api/ai/judge', {
      code: codeO_1,
      language: 'javascript',
      problemTitle: 'Add Two Numbers',
    });
    const res = await judgePost(req);
    const body = await res.json();

    const passed = body.success && body.report.timeComplexity === 'O(1)';
    record(
      'Judge',
      'Time Complexity O(1) Pattern Match',
      passed,
      `Returned timeComplexity: ${body.report?.timeComplexity}, overallScore: ${body.report?.overallScore}`
    );
  } catch (err: any) {
    record('Judge', 'Time Complexity O(1) Pattern Match', false, `Error: ${err.message}`);
  }

  // 1.4 Time Complexity Analysis - Binary Search O(log N)
  try {
    const codeBinarySearch = `
      int search(vector<int>& nums, int target) {
        int low = 0, high = nums.size() - 1;
        while (low <= high) {
          int mid = low + (high - low) / 2;
          if (nums[mid] == target) return mid;
          else if (nums[mid] < target) low = mid + 1;
          else high = mid - 1;
        }
        return -1;
      }
    `;
    const req = createJsonRequest('http://localhost:3000/api/ai/judge', {
      code: codeBinarySearch,
      language: 'cpp',
      problemTitle: 'Binary Search',
    });
    const res = await judgePost(req);
    const body = await res.json();

    const passed = body.success && body.report.timeComplexity === 'O(log N)';
    record(
      'Judge',
      'Time Complexity O(log N) Binary Search',
      passed,
      `Returned timeComplexity: ${body.report?.timeComplexity}`
    );
  } catch (err: any) {
    record('Judge', 'Time Complexity O(log N) Binary Search', false, `Error: ${err.message}`);
  }

  // 1.5 Edge Case Resilience Evaluation
  try {
    const codeWithGuards = `
      function process(arr) {
        if (!arr || arr.length === 0) return null;
        if (arr.length <= 0) return 0;
        return arr[0];
      }
    `;
    const reqGuards = createJsonRequest('http://localhost:3000/api/ai/judge', { code: codeWithGuards });
    const resGuards = await judgePost(reqGuards);
    const bodyGuards = await resGuards.json();

    const codeNoGuards = `
      function process(arr) {
        return arr[0];
      }
    `;
    const reqNoGuards = createJsonRequest('http://localhost:3000/api/ai/judge', { code: codeNoGuards });
    const resNoGuards = await judgePost(reqNoGuards);
    const bodyNoGuards = await resNoGuards.json();

    const scoreWithGuards = bodyGuards.report?.edgeCaseScore;
    const scoreNoGuards = bodyNoGuards.report?.edgeCaseScore;

    const passed = scoreWithGuards > scoreNoGuards;
    record(
      'Judge',
      'Edge Case Resilience Score Differentiation',
      passed,
      `With guards: ${scoreWithGuards} (${bodyGuards.report?.edgeCaseRating}), Without guards: ${scoreNoGuards} (${bodyNoGuards.report?.edgeCaseRating})`
    );
  } catch (err: any) {
    record('Judge', 'Edge Case Resilience Score Differentiation', false, `Error: ${err.message}`);
  }

  // 1.6 Syntax Errors & Malformed Inputs
  try {
    const brokenCode = `function broken(a, b { return a + `;
    const req = createJsonRequest('http://localhost:3000/api/ai/judge', {
      code: brokenCode,
      language: 'python',
    });
    const res = await judgePost(req);
    const body = await res.json();

    const passed = body.success === true && body.report !== undefined;
    record(
      'Judge',
      'Graceful Handling of Syntax Errors / Broken Snippets',
      passed,
      `Status: ${res.status}, Returned report verdict: ${body.report?.verdict}, overallScore: ${body.report?.overallScore}`
    );
  } catch (err: any) {
    record('Judge', 'Graceful Handling of Syntax Errors', false, `Error: ${err.message}`);
  }

  // 1.7 Test Case Verdicts Integration (Partial & Wrong Answer)
  try {
    const reqWrong = createJsonRequest('http://localhost:3000/api/ai/judge', {
      code: 'function test() {}',
      testResults: [
        { passed: true, status: 'PASSED' },
        { passed: false, status: 'FAILED' },
        { passed: false, status: 'FAILED' },
      ],
    });
    const resWrong = await judgePost(reqWrong);
    const bodyWrong = await resWrong.json();

    const passed = bodyWrong.report?.correctnessScore === 33 && bodyWrong.report?.verdict === 'Wrong Answer';
    record(
      'Judge',
      'Test Case Results Integration (Partial / Failed)',
      passed,
      `correctnessScore: ${bodyWrong.report?.correctnessScore}, verdict: ${bodyWrong.report?.verdict}`
    );
  } catch (err: any) {
    record('Judge', 'Test Case Results Integration', false, `Error: ${err.message}`);
  }

  // 1.8 Empty Body Request
  try {
    const reqEmpty = createJsonRequest('http://localhost:3000/api/ai/judge', {});
    const resEmpty = await judgePost(reqEmpty);
    const bodyEmpty = await resEmpty.json();

    const passed = bodyEmpty.success === true && bodyEmpty.report !== undefined;
    record(
      'Judge',
      'Empty Request Body Handling',
      passed,
      `Status: ${resEmpty.status}, overallScore: ${bodyEmpty.report?.overallScore}`
    );
  } catch (err: any) {
    record('Judge', 'Empty Request Body Handling', false, `Error: ${err.message}`);
  }

  // --- SECTION 2: ROOM CREATION & ON-DEMAND CONTESTS (/api/rooms/create) ---
  console.log('\n--- 2. EMPIRICAL TESTING OF /api/rooms/create ---');

  const testUser = await getOrCreateTestUser();
  const token = signToken({
    id: testUser.id,
    email: testUser.email,
    name: testUser.name,
    role: testUser.role,
  });

  // 2.1 Auth Enforcement (Unauthenticated Request)
  try {
    const reqNoAuth = createJsonRequest('http://localhost:3000/api/rooms/create', { name: 'Test Arena' });
    const resNoAuth = await createRoomPost(reqNoAuth);
    const bodyNoAuth = await resNoAuth.json();

    const passed = resNoAuth.status === 401 && bodyNoAuth.error === 'Sign in to create a battle room.';
    record(
      'Rooms Create',
      'Authentication Enforcement (401 Unauthorized)',
      passed,
      `Status: ${resNoAuth.status}, Error message: "${bodyNoAuth.error}"`
    );
  } catch (err: any) {
    record('Rooms Create', 'Authentication Enforcement', false, `Error: ${err.message}`);
  }

  // 2.2 Standard DUEL Room Creation
  try {
    const req = createJsonRequest('http://localhost:3000/api/rooms/create', {
      name: 'Empirical Duel Room',
      difficulty: 'EASY',
      mode: 'DUEL',
    }, token);
    const res = await createRoomPost(req);
    const body = await res.json();

    const passed =
      res.status === 200 &&
      body.success === true &&
      body.roomCode.startsWith('BATTLE-') &&
      body.room.mode === 'DUEL' &&
      body.room.participants.length === 1 &&
      body.room.participants[0].userId === testUser.id;

    record(
      'Rooms Create',
      'Standard DUEL Room Creation',
      passed,
      `roomCode: ${body.roomCode}, mode: ${body.room?.mode}, participants: ${body.room?.participants?.length}`
    );
  } catch (err: any) {
    record('Rooms Create', 'Standard DUEL Room Creation', false, `Error: ${err.message}`);
  }

  // 2.3 Standard SQUAD Room Creation (Multi-Problem)
  try {
    const req = createJsonRequest('http://localhost:3000/api/rooms/create', {
      name: 'Empirical Squad Room',
      difficulty: 'MEDIUM',
      mode: 'SQUAD',
      problemCount: 3,
      durationSeconds: 1800,
    }, token);
    const res = await createRoomPost(req);
    const body = await res.json();

    const passed =
      res.status === 200 &&
      body.success === true &&
      body.room.mode === 'SQUAD' &&
      body.room.problemCount === 3 &&
      body.room.durationSeconds === 1800;

    record(
      'Rooms Create',
      'Standard SQUAD Room Creation (3 problems, 1800s)',
      passed,
      `mode: ${body.room?.mode}, problemCount: ${body.room?.problemCount}, durationSeconds: ${body.room?.durationSeconds}`
    );
  } catch (err: any) {
    record('Rooms Create', 'Standard SQUAD Room Creation', false, `Error: ${err.message}`);
  }

  // 2.4 Bot Participant Joining (`addAiBot: true` / `isAiDuel: true`)
  try {
    const req = createJsonRequest('http://localhost:3000/api/rooms/create', {
      name: '1v1 vs Grandmaster',
      difficulty: 'MIXED',
      mode: 'DUEL',
      addAiBot: true,
      isAiDuel: true,
    }, token);
    const res = await createRoomPost(req);
    const body = await res.json();

    const participants = body.room?.participants || [];
    const botParticipant = participants.find((p: any) => p.userId === 'ai_bot_challenger');
    const userPart = participants.find((p: any) => p.userId === testUser.id);

    const passed =
      res.status === 200 &&
      participants.length === 2 &&
      userPart !== undefined &&
      botParticipant !== undefined &&
      botParticipant.userName === 'Grandmaster';

    record(
      'Rooms Create',
      'Bot Participant Joining (Grandmaster attached)',
      passed,
      `Participants count: ${participants.length}, Bot name: "${botParticipant?.userName}", Bot ID: "${botParticipant?.userId}"`
    );
  } catch (err: any) {
    record('Rooms Create', 'Bot Participant Joining', false, `Error: ${err.message}`);
  }

  // 2.5 ADVERSARIAL CHALLENGE: Passing mode: 'AI_DUEL' without addAiBot / isAiDuel flags
  try {
    const req = createJsonRequest('http://localhost:3000/api/rooms/create', {
      name: 'Bot Duel Challenge',
      difficulty: 'MIXED',
      mode: 'AI_DUEL',
    }, token);
    const res = await createRoomPost(req);
    const body = await res.json();

    const participants = body.room?.participants || [];
    const botParticipant = participants.find((p: any) => p.userId === 'ai_bot_challenger');

    const isBotAdded = botParticipant !== undefined;
    record(
      'Adversarial Challenge',
      "Passing mode: 'AI_DUEL' attaches Bot participant",
      isBotAdded,
      `Participants count: ${participants.length}, Bot attached: ${isBotAdded}`
    );
  } catch (err: any) {
    record('Adversarial Challenge', "Passing mode: 'AI_DUEL'", false, `Error: ${err.message}`);
  }

  // 2.6 ADVERSARIAL CHALLENGE: Passing custom mode 'BLITZ_15' or 'BLITZ_30'
  try {
    const reqBlitz15 = createJsonRequest('http://localhost:3000/api/rooms/create', {
      name: '15m Blitz',
      difficulty: 'EASY',
      mode: 'BLITZ_15',
      problemCount: 3,
      durationSeconds: 900,
    }, token);
    const resBlitz15 = await createRoomPost(reqBlitz15);
    const bodyBlitz15 = await resBlitz15.json();

    const isSquadMode = bodyBlitz15.room?.mode === 'SQUAD';
    const problemCountCorrect = bodyBlitz15.room?.problemCount === 3;

    record(
      'Adversarial Challenge',
      "Passing mode: 'BLITZ_15' creates multi-problem SQUAD battle",
      isSquadMode && problemCountCorrect,
      `Returned room mode: "${bodyBlitz15.room?.mode}", problemCount: ${bodyBlitz15.room?.problemCount}`
    );
  } catch (err: any) {
    record('Adversarial Challenge', "Passing mode: 'BLITZ_15'", false, `Error: ${err.message}`);
  }

  // 2.7 Room Lifecycle & Retrieval (/api/rooms/[code])
  try {
    const createReq = createJsonRequest('http://localhost:3000/api/rooms/create', {
      name: 'Lifecycle Room',
      difficulty: 'EASY',
      mode: 'DUEL',
    }, token);
    const createRes = await createRoomPost(createReq);
    const createBody = await createRes.json();
    const roomCode = createBody.roomCode;

    const getReq = new NextRequest(`http://localhost:3000/api/rooms/${roomCode}`);
    const getRes = await getRoomByCode(getReq, { params: Promise.resolve({ code: roomCode }) });
    const getBody = await getRes.json();

    const passed =
      getRes.status === 200 &&
      getBody.room.code === roomCode &&
      Array.isArray(getBody.problems) &&
      getBody.problems.length > 0;

    record(
      'Rooms Lifecycle',
      'GET /api/rooms/[code] Details & Problems Retrieval',
      passed,
      `Fetched room: ${getBody.room?.code}, Status: ${getBody.room?.status}, Problems attached: ${getBody.problems?.length}`
    );
  } catch (err: any) {
    record('Rooms Lifecycle', 'GET /api/rooms/[code] Details', false, `Error: ${err.message}`);
  }

  // --- SUMMARY ---
  console.log('\n================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`SUMMARY: ${passedCount}/${totalCount} Passed.`);
  console.log('================================================================\n');

  if (passedCount < totalCount) {
    console.log('⚠️ NOTE: Adversarial challenges surfaced key findings (documented above).');
  }
}

runEmpiricalTests()
  .catch((err) => {
    console.error('Fatal error during test execution:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
