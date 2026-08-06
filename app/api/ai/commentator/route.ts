import { NextRequest, NextResponse } from 'next/server';
import { callFreeModel, hasFreeModelProvider, MODELS } from '@/lib/freemodel';
import { rateLimitResponse } from '@/lib/rateLimit';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface BattleParticipant {
  id?: string;
  userId?: string;
  name?: string;
  userName?: string;
  score?: number;
  scores?: number;
  solved?: number;
  timeSpent?: number;
  progress?: string;
}

export interface CommentatorRequestBody {
  roomCode?: string;
  roomName?: string;
  eventType?: 'JOIN' | 'SUBMIT' | 'LEAD_SWAP' | 'FAST_SUBMISSION' | 'HIGH_SCORE' | 'TICK' | 'TYPING_PROGRESS' | 'CODE_ANALYSIS' | 'RUN_CODE' | 'SAMPLE_PASSED' | 'SAMPLE_FAILED' | 'SUBMIT_FAILED' | string;
  event?: string;
  participants?: BattleParticipant[];
  problemTitle?: string;
  activeProblemTitle?: string;
  language?: string;
  codeSnippet?: string;
  linesOfCode?: number;
  timeRemainingSeconds?: number;
  privacyMode?: boolean | 'private_room';
  codeAnalysis?: {
    lineCount?: number;
    nonEmptyLineCount?: number;
    functionCount?: number;
    loopCount?: number;
    conditionalCount?: number;
    hasInputParsing?: boolean;
    hasReturn?: boolean;
    hasConsoleOutput?: boolean;
    hasTodo?: boolean;
    possibleIssue?: string;
    phase?: string;
    signature?: string;
  };
  executionResult?: {
    verdict?: string;
    stdout?: string;
    stderr?: string;
    failedTestCase?: string;
  };
  mode?: string;
  status?: string;
  userName?: string;
}

type HypeLevel = 'high' | 'medium' | 'low';

const VALID_HYPE_LEVELS = new Set<HypeLevel>(['high', 'medium', 'low']);
const PRIVATE_ROOM_CODE_PATTERN = /^[A-Z0-9-]{4,40}$/;

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function cleanOptionalText(value: unknown, maxLength: number): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function participantName(participant: BattleParticipant | undefined, fallback: string): string {
  return cleanOptionalText(participant?.userName, 80) || cleanOptionalText(participant?.name, 80) || fallback;
}

function participantScore(participant: BattleParticipant | undefined): number {
  const score = participant?.score ?? participant?.scores ?? 0;
  return Number.isFinite(score) ? Number(score) : 0;
}

function participantSolved(participant: BattleParticipant | undefined): number {
  const solved = participant?.solved ?? 0;
  return Number.isFinite(solved) ? Number(solved) : 0;
}

function cleanProgress(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 24).toUpperCase() : 'WAITING';
}

function cleanCodeAnalysis(value: unknown): Required<NonNullable<CommentatorRequestBody['codeAnalysis']>> {
  const analysis = value && typeof value === 'object' ? value as NonNullable<CommentatorRequestBody['codeAnalysis']> : {};
  const safeNumber = (item: unknown, max: number) => Number.isFinite(item) ? Math.max(0, Math.min(max, Number(item))) : 0;
  const safeBool = (item: unknown) => item === true;

  return {
    lineCount: safeNumber(analysis.lineCount, 100_000),
    nonEmptyLineCount: safeNumber(analysis.nonEmptyLineCount, 100_000),
    functionCount: safeNumber(analysis.functionCount, 10_000),
    loopCount: safeNumber(analysis.loopCount, 10_000),
    conditionalCount: safeNumber(analysis.conditionalCount, 10_000),
    hasInputParsing: safeBool(analysis.hasInputParsing),
    hasReturn: safeBool(analysis.hasReturn),
    hasConsoleOutput: safeBool(analysis.hasConsoleOutput),
    hasTodo: safeBool(analysis.hasTodo),
    possibleIssue: cleanText(analysis.possibleIssue, 'No obvious issue spotted', 120),
    phase: cleanText(analysis.phase, 'drafting', 40),
    signature: cleanText(analysis.signature, 'empty', 80),
  };
}

function normalizeAiCommentary(text: string, fallback: string): string {
  const normalized = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^[-*#>\s]+/g, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length < 10) return fallback;

  const firstLine = normalized.split(/\r?\n/)[0]?.trim() || fallback;
  const firstSentence = firstLine.match(/^(.{1,180}?[.!?])(?:\s|$)/)?.[1] || firstLine.slice(0, 180);
  return firstSentence.trim();
}

function isUnsafeAiCommentary(text: string, roomCode: string, isPrivateRoom: boolean): boolean {
  const normalized = text.toLowerCase();
  const cleanRoomCode = roomCode.trim().toLowerCase();
  if (isPrivateRoom && cleanRoomCode && normalized.includes(cleanRoomCode)) return true;
  if (/```|<\/?[a-z][\s\S]*?>|(?:^|\s)(function|class|const|let|var|#include|import\s+\w|public\s+static|console\.log|std::|=>)(?:\s|$)/i.test(text)) return true;
  if (/^[-*#>]/.test(text.trim())) return true;
  return text.split(/\s+/).filter(Boolean).length > 32;
}

function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.min(24 * 60 * 60, Math.floor(totalSeconds)));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function scoreGap(leader: BattleParticipant | undefined, chaser: BattleParticipant | undefined): number {
  return Math.max(0, participantScore(leader) - participantScore(chaser));
}

async function verifyPrivateRoomAccess(req: NextRequest, roomCode: string, privacyMode: boolean): Promise<NextResponse | null> {
  if (!privacyMode || !PRIVATE_ROOM_CODE_PATTERN.test(roomCode)) return null;

  const session = getSessionFromRequest(req);
  if (!session?.userId) {
    return NextResponse.json({ error: 'Sign in to use private room commentary.' }, { status: 401 });
  }

  const room = await prisma.customRoom.findUnique({
    where: { code: roomCode.toUpperCase() },
    select: {
      id: true,
      participants: {
        where: { userId: session.userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!room || room.participants.length === 0) {
    return NextResponse.json({ error: 'Join this private room before using its commentator.' }, { status: 403 });
  }

  return null;
}

async function readCommentatorBody(req: NextRequest): Promise<CommentatorRequestBody> {
  try {
    const parsed = await req.json();
    return parsed && typeof parsed === 'object' ? parsed as CommentatorRequestBody : {};
  } catch {
    return {};
  }
}

function generateNativeFallback(
  eventType: string,
  leaderName: string,
  leaderScore: number,
  chaserName: string,
  problemTitle: string,
  roomLabel: string,
  participantCount: number,
  linesOfCode: number = 0,
  executionResult?: { verdict?: string; stdout?: string; stderr?: string; failedTestCase?: string },
  timeRemainingSeconds?: number,
  scoreLead: number = 0,
  leaderSolved: number = 0,
  leaderProgress: string = 'CODING',
  codeAnalysis: Required<NonNullable<CommentatorRequestBody['codeAnalysis']>> = cleanCodeAnalysis(undefined)
): { text: string; hypeLevel: HypeLevel } {
  const norm = (eventType || 'TICK').toUpperCase();
  const clockText = Number.isFinite(timeRemainingSeconds) ? ` with ${formatClock(Number(timeRemainingSeconds))} left` : '';
  const leadText = scoreLead > 0 ? ` by ${scoreLead} pts` : '';
  const progressText = leaderProgress === 'SOLVED' ? 'has a solve banked' : leaderProgress === 'SUBMITTED' ? 'is waiting on a verdict' : 'is deep in implementation';

  if (norm === 'TYPING_PROGRESS') {
    const options = [
      `PLAY-BY-PLAY: ${leaderName} is making rapid progress on "${problemTitle}"! Already written ${linesOfCode} lines of code and building the core logic!`,
      `CODE ANALYST: ${leaderName} has completed over half of their solution (${linesOfCode} lines)! The algorithm structure is taking shape!`,
      `SPEED TYPING: ${leaderName} is flying through the implementation in ${roomLabel}! ${linesOfCode} lines locked in so far!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'medium' };
  }

  if (norm === 'CODE_ANALYSIS') {
    const issueText = codeAnalysis.possibleIssue === 'No obvious issue spotted'
      ? 'no obvious red flags'
      : codeAnalysis.possibleIssue.toLowerCase();
    const structureText = codeAnalysis.loopCount > 0
      ? `${codeAnalysis.loopCount} loop${codeAnalysis.loopCount === 1 ? '' : 's'} in motion`
      : codeAnalysis.conditionalCount > 0
      ? `${codeAnalysis.conditionalCount} branch${codeAnalysis.conditionalCount === 1 ? '' : 'es'} shaping the logic`
      : 'the skeleton is still taking form';
    const options = [
      `CODE READ: ${leaderName} is in the ${codeAnalysis.phase} phase with ${codeAnalysis.nonEmptyLineCount} active lines and ${structureText}.`,
      `ANALYSIS SNAPSHOT: ${leaderName}'s solution shows ${structureText}; ${issueText} so far.`,
      `TACTICAL CHECK: ${leaderName} has ${codeAnalysis.functionCount} helper block${codeAnalysis.functionCount === 1 ? '' : 's'} and ${codeAnalysis.nonEmptyLineCount} live lines${clockText}.`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: codeAnalysis.possibleIssue === 'No obvious issue spotted' ? 'low' : 'medium' };
  }

  if (norm === 'RUN_CODE') {
    const options = [
      `TEST EXECUTION: ${leaderName} just ran sample test cases on "${problemTitle}"! Awaiting execution output...`,
      `TESTING LOGIC: ${leaderName} is testing their logic live against sample inputs!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'medium' };
  }

  if (norm === 'SAMPLE_PASSED') {
    const options = [
      `SAMPLE PASSED! ${leaderName} passed sample test cases on "${problemTitle}"! They're getting super close to full submission!`,
      `TARGET ACQUIRED! ${leaderName}'s sample test execution succeeded! Preparing for final submission!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'high' };
  }

  if (norm === 'SAMPLE_FAILED' || norm === 'RUN_FAILED') {
    const verdict = executionResult?.verdict || 'Runtime Error';
    const options = [
      `DEBUG ALERT! ${leaderName} hit a ${verdict} during sample tests! Debugging boundary conditions now...`,
      `TROUBLESHOOTING: ${leaderName}'s test execution failed (${verdict})! Analyzing test case inputs to patch the bug...`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'medium' };
  }

  if (norm === 'SUBMIT_FAILED') {
    const verdict = executionResult?.verdict || 'Wrong Answer';
    const options = [
      `CRITICAL BUG! ${leaderName} submitted for "${problemTitle}" but hit ${verdict}! Huge window of opportunity for ${chaserName || 'opponents'}!`,
      `TEST CASE FAILED! ${leaderName}'s submission was rejected (${verdict}). Back to the drawing board!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'high' };
  }

  if (norm === 'JOIN') {
    const options = [
      `A new challenger enters the arena! ${roomLabel} now has ${participantCount} coders locked in for battle!`,
      `ARENA LOCK-IN! The competitive atmosphere spikes in ${roomLabel} as coders prepare to tackle "${problemTitle}"!`,
      `CHALLENGER APPROACHING! New player joins the lobby. Who will take early dominance on "${problemTitle}"?`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'medium' };
  }

  if (norm === 'LEAD_SWAP') {
    const options = [
      `LEAD SWAP ALERT! ${leaderName} surges into 1st place with ${leaderScore} pts, dethroning ${chaserName || 'the competition'} on "${problemTitle}"!`,
      `BOOM! ${leaderName} pulls off an incredible takeover! Now commanding 1st place with ${leaderScore} points!`,
      `HIGH VOLTAGE OVERTAKE! ${leaderName} snatches the lead! The arena goes wild!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'high' };
  }

  if (norm === 'FAST_SUBMISSION' || norm === 'SPEED_RUN') {
    const options = [
      `LIGHTNING SPEED! ${leaderName} smashes out an accepted submission on "${problemTitle}" in record speed!`,
      `SPEED RUNNER IN THE HOUSE! ${leaderName} locked in an optimal solution before the clock even warmed up!`,
      `BLISTERING PACE! ${leaderName} submits with lightning velocity! Maximum speed bonus unlocked!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'high' };
  }

  if (norm === 'HIGH_SCORE') {
    const options = [
      `ARENA HIGH SCORE! ${leaderName} shatters the score barrier with a towering ${leaderScore} pts!`,
      `RECORD BREAKER! ${leaderName} sets a new high score peak on "${problemTitle}"! Unstoppable force!`,
      `MASTERCLASS! ${leaderName} locks in ${leaderScore} points with brilliant algorithmic precision!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'high' };
  }

  if (norm === 'SUBMIT' || norm === 'SCORE_POINTS' || norm === 'SUBMIT_ACCEPTED') {
    const options = [
      `ACCEPTED! ${leaderName} submits a working solution for "${problemTitle}" and claims ${leaderScore} pts!`,
      `ALL TEST CASES PASSED! ${leaderName} puts points on the board with clean execution on "${problemTitle}"!`,
      `SUBMISSION LOCKED! ${leaderName} delivers a successful solution to the judge${clockText}!`,
    ];
    return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'medium' };
  }

  // Default / TICK / PERIODIC_UPDATE
  const options = [
    `SHOUTCASTER DESK: ${leaderName || 'Coders'} leads${leadText} with ${leaderScore} pts and ${leaderSolved} solved on "${problemTitle}"${clockText}!`,
    `ANALYST DESK: ${leaderName} ${progressText}; clean time complexity will decide ${roomLabel}${clockText}!`,
    `ARENA UPDATE: ${participantCount} coders battling live for "${problemTitle}". Every millisecond matters!`,
    `INTENSE SHOWDOWN: The algorithm duel in ${roomLabel} reaches peak tension! Who will make the next clutch move?`,
  ];
  return { text: options[Math.floor(Math.random() * options.length)], hypeLevel: 'low' };
}

export async function POST(req: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(req, 'ai:commentator', 30, 60 * 1000);
    if (limitResponse) return limitResponse;
    const body = await readCommentatorBody(req);
    const roomCode = cleanText(body.roomCode || body.roomName, 'ARENA-1', 40);
    const isPrivateRoom = body.privacyMode === true || body.privacyMode === 'private_room';
    const accessResponse = await verifyPrivateRoomAccess(req, roomCode, isPrivateRoom);
    if (accessResponse) return accessResponse;

    const roomLabel = isPrivateRoom ? 'the private room' : roomCode;
    const eventType = cleanText(body.eventType || body.event, 'TICK', 50).toUpperCase();
    const participants = Array.isArray(body.participants)
      ? body.participants
          .filter((participant) => participant && typeof participant === 'object')
          .slice(0, 10)
      : [];
    const problemTitle = cleanText(body.problemTitle || body.activeProblemTitle, 'DSA Challenge', 300);
    const language = cleanText(body.language, 'cpp', 32);
    const linesOfCode = Number.isFinite(body.linesOfCode)
      ? Math.max(0, Math.min(100_000, Number(body.linesOfCode)))
      : 0;
    const timeRemainingSeconds = Number.isFinite(body.timeRemainingSeconds)
      ? Math.max(0, Math.min(24 * 60 * 60, Number(body.timeRemainingSeconds)))
      : undefined;
    const executionResult = body.executionResult && typeof body.executionResult === 'object'
      ? body.executionResult
      : undefined;
    const codeAnalysis = cleanCodeAnalysis(body.codeAnalysis);
    const actorName = cleanOptionalText(body.userName, 80);

    // Extract leader and second place participant details
    const sortedParticipants = [...participants].sort((a, b) => participantScore(b) - participantScore(a));
    const leader = sortedParticipants[0];
    const chaser = sortedParticipants[1];

    const leaderName = participantName(leader, actorName || 'Top Coder');
    const featuredName = actorName || leaderName;
    const leaderScore = participantScore(leader);
    const chaserName = chaser ? participantName(chaser, 'Opponent') : '';
    const leaderSolved = participantSolved(leader);
    const leaderProgress = cleanProgress(leader?.progress);
    const lead = scoreGap(leader, chaser);

    // Generate native fallback commentary
    const fallback = generateNativeFallback(
      eventType,
      featuredName,
      leaderScore,
      chaserName,
      problemTitle,
      roomLabel,
      participants.length,
      linesOfCode,
      executionResult,
      timeRemainingSeconds,
      lead,
      leaderSolved,
      leaderProgress,
      codeAnalysis
    );

    let commentaryText = fallback.text;
    let hypeLevel: HypeLevel = fallback.hypeLevel;

    // Call FreeModel guided if configured
    if (hasFreeModelProvider()) {
      try {
        const systemInstruction =
          'You are an elite, high-energy esports shoutcaster broadcasting a competitive coding duel. ' +
          'Give granular play-by-play commentary like a real sports caster (e.g. mention player progress, line count, failing test cases, getting close, or debugging). ' +
          'Write exactly 1 punchy, exciting callout line (max 25 words). Use player names and clear text only. ' +
          'No markdown, bullets, emojis, quotation marks, source code, account details, or private room codes.';

        const userInstruction =
          `Arena: ${roomLabel}. Event: ${eventType}. Player: ${featuredName}. Leader: ${leaderName} (${leaderScore} pts, ${leaderSolved} solved, ${leaderProgress}). `+
          `Score lead: ${lead}. Participants: ${participants.length}. Problem: "${problemTitle}". `+
          `Lines of code written: ${linesOfCode}. Code phase: ${codeAnalysis.phase}. Structure: ${codeAnalysis.nonEmptyLineCount} active lines, `+
          `${codeAnalysis.functionCount} functions, ${codeAnalysis.loopCount} loops, ${codeAnalysis.conditionalCount} conditionals. `+
          `Static issue: ${codeAnalysis.possibleIssue}. Time remaining: ${timeRemainingSeconds !== undefined ? formatClock(timeRemainingSeconds) : 'N/A'}. Test Verdict: ${executionResult?.verdict || 'N/A'}. `+
          `Language: ${language}. Deliver the play-by-play shoutcast line now.`;

        const aiResponse = await callFreeModel({
          model: MODELS.FAST,
          systemInstruction,
          userInstruction,
          temperature: 0.8,
          maxTokens: 80,
          timeoutMs: 3500,
          fallbackText: fallback.text,
        });

        if (aiResponse) {
          const normalizedResponse = normalizeAiCommentary(aiResponse, fallback.text);
          commentaryText = isUnsafeAiCommentary(normalizedResponse, roomCode, isPrivateRoom)
            ? fallback.text
            : normalizedResponse;
          if (['LEAD_SWAP', 'FAST_SUBMISSION', 'HIGH_SCORE', 'SUBMIT_FAILED', 'SAMPLE_PASSED'].includes(eventType)) {
            hypeLevel = 'high';
          } else if (['SUBMIT', 'SUBMIT_ATTEMPT', 'JOIN', 'TYPING_PROGRESS', 'CODE_ANALYSIS', 'RUN_CODE'].includes(eventType)) {
            hypeLevel = 'medium';
          }
        }
      } catch (error: unknown) {
        console.warn('[Commentator API] FreeModel call failed, utilizing native fallback:', error);
      }
    }

    return NextResponse.json({
      commentary: commentaryText,
      timestamp: Date.now(),
      hypeLevel: VALID_HYPE_LEVELS.has(hypeLevel) ? hypeLevel : 'medium',
      speaker: 'Shoutcaster',
      success: true,
    });
  } catch (error: unknown) {
    console.error('Error in guided Commentator route:', error);
    return NextResponse.json(
      {
        commentary: 'SHOUTCASTER DESK: High-intensity competitive coding underway in the arena!',
        timestamp: Date.now(),
        hypeLevel: 'medium',
        speaker: 'Shoutcaster',
        success: true,
        source: 'last_resort_fallback',
      }
    );
  }
}
