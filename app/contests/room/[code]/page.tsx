'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const CodeEditor = dynamic(() => import('@/components/editor/CodeEditor'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading Monaco Editor...</div>,
});
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Users,
  Trophy,
  Copy,
  Check,
  Play,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  Medal,
  Sparkles,
  Zap,
  Flame,
  Share2,
  ArrowLeft,
  LogOut,
  Power,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { LiveCommentator } from '@/components/contests/LiveCommentator';
import { JudgeScorecardModal, JudgeReportProps } from '@/components/contests/JudgeScorecardModal';
import { ProblemMarkdown } from '@/components/ui/ProblemMarkdown';

interface ExecutionResult {
  verdict?: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  testResults?: unknown;
  results?: unknown;
  time?: number;
  executionTime?: number;
  memory?: number;
  memoryUsed?: number;
  [key: string]: unknown;
}

interface Participant {
  id: string;
  userId: string;
  userName: string;
  score: number;
  solved: number;
  progress: 'WAITING' | 'CODING' | 'SUBMITTED' | 'SOLVED';
  acceptedAt?: string | null;
}

interface RoomData {
  id: string;
  code: string;
  name: string;
  hostName: string;
  maxPlayers: number;
  difficulty: string;
  problemCount: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  participants: Participant[];
  mode: 'DUEL' | 'SQUAD';
  durationSeconds: number;
  startedAt?: string | null;
  endedAt?: string | null;
  winnerId?: string | null;
}

interface ProblemItem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  topicTags: string;
  testCases: Array<{ id: string; input: string; expectedOutput: string }>;
  codeTemplates: Array<{ language: string; code: string }>;
}

export default function BattleRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const roomCode = (params.code as string)?.toUpperCase();

  const [room, setRoom] = useState<RoomData | null>(null);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('// Write your C++ solution here\n');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<Record<string, boolean>>({});
  const [battleUserId, setBattleUserId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [judgeReport, setJudgeReport] = useState<JudgeReportProps | null>(null);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>('JOIN');
  const prevTopLeaderRef = React.useRef<{ id: string; score: number } | null>(null);
  const editorTemplateKeyRef = useRef<string | null>(null);
  const hostUserId = room?.participants.find((participant) => participant.userName === room.hostName)?.userId;

  const currentUserId = user?.id || battleUserId || `guest_local`;
  const currentUserName = user?.name || 'Guest Coder';

  const fetchRoomDetails = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, {
        credentials: 'include',
        signal,
      });
      if (!res.ok) {
        throw new Error('Room not found');
      }
      const data = await res.json();
      setRoom(data.room);
      setProblems(data.problems || []);

      if (data.room?.participants?.length > 0) {
        const top = data.room.participants[0];
        if (prevTopLeaderRef.current && prevTopLeaderRef.current.id !== top.userId && top.score > 0) {
          setLastEvent('LEAD_SWAP');
        }
        prevTopLeaderRef.current = { id: top.userId, score: top.score };
      }

      if (data.room.startedAt) {
        setNow(Date.now());
      }

    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        const message = err instanceof Error ? err.message : 'Error loading battle room';
        showToast(message, 'error');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [roomCode, showToast]);

  useEffect(() => {
    if (roomCode) {
      const controller = new AbortController();
      let requestInFlight = false;
      const storedId = window.localStorage.getItem(`codeforge_battle_${roomCode}`);
      if (storedId) setBattleUserId(storedId);

      const poll = async () => {
        if (requestInFlight || controller.signal.aborted) return;
        requestInFlight = true;
        try {
          await fetchRoomDetails(controller.signal);
        } finally {
          requestInFlight = false;
        }
      };

      poll();
      const interval = setInterval(poll, 3000); // Live sync room leaderboard
      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }
  }, [roomCode, fetchRoomDetails]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const updateProgress = async (nextProgress: 'CODING' | 'SUBMITTED') => {
    if (!room || room.status !== 'IN_PROGRESS') return;
    await fetch(`/api/rooms/${roomCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'UPDATE_PROGRESS', userId: currentUserId, progress: nextProgress }),
    });
  };

  useEffect(() => {
    if (problems.length > 0) {
      const p = problems[activeProblemIdx];
      if (p) {
        const editorTemplateKey = `${p.id}:${language}`;
        if (editorTemplateKeyRef.current === editorTemplateKey) return;
        const template = p.codeTemplates?.find((t: { language: string; code: string }) => t.language === language);
        editorTemplateKeyRef.current = editorTemplateKey;
        setCode(template?.code || '');
      }
    }
  }, [language, activeProblemIdx, problems]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    showToast('Room Code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStartBattle = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'START_BATTLE' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(' Battle Started! First to submit gets bonus speed points!', 'success');
        await fetchRoomDetails();
      } else {
        showToast(data.error || 'Battle needs two coders to start', 'error');
      }
    } catch (err) {
      showToast('Failed to start battle', 'error');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await fetch(`/api/rooms/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'LEAVE_ROOM' }),
      });
      showToast('You left the battle room', 'info');
      router.push('/contests');
    } catch {
      router.push('/contests');
    }
  };

  const handleCloseRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'CLOSE_ROOM' }),
      });
      if (res.ok) {
        showToast('Room has been closed', 'info');
        router.push('/contests');
      } else {
        showToast('Failed to close room', 'error');
      }
    } catch {
      showToast('Failed to close room', 'error');
    }
  };

  const handleRunCode = async () => {
    const activeProblem = problems[activeProblemIdx];
    if (!activeProblem) return;

    setExecuting(true);
    setExecutionResult(null);

    try {
      const sampleTc = activeProblem.testCases?.[0];
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          language,
          code,
          customInput: sampleTc?.input || '',
        }),
      });

      const data = await res.json();
      setExecutionResult(data);
      if (data.verdict === 'Accepted' || (!data.stderr && !data.error)) {
        setLastEvent('SAMPLE_PASSED');
      } else {
        setLastEvent('SAMPLE_FAILED');
      }
    } catch (err: unknown) {
      showToast('Code execution error', 'error');
      setLastEvent('SAMPLE_FAILED');
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    const activeProblem = problems[activeProblemIdx];
    if (!activeProblem) return;

    setExecuting(true);
    setExecutionResult(null);

    try {
      await updateProgress('SUBMITTED');
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          problemId: activeProblem.id,
          language,
          code,
        }),
      });

      const data = await res.json();
      setExecutionResult(data);

      if (data.verdict === 'Accepted') {
        showToast(' Accepted! Solution passed all test cases!', 'success');
        setSolvedProblems((prev) => ({ ...prev, [activeProblem.id]: true }));

        const startTime = room?.startedAt ? new Date(room.startedAt).getTime() : now;
        const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

        if (elapsedSeconds > 0 && elapsedSeconds <= 120) {
          setLastEvent('FAST_SUBMISSION');
        } else if ((viewerParticipant?.score || 0) + 150 >= 300) {
          setLastEvent('HIGH_SCORE');
        } else {
          setLastEvent('SUBMIT');
        }

        // Award points in battle room
        await fetch(`/api/rooms/${roomCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'SCORE_POINTS',
            userId: currentUserId,
            userName: currentUserName,
            problemId: activeProblem.id,
            pointsToAdd: 150, // 100 pts base + 50 speed bonus
          }),
        });

        // Trigger judge evaluation
        try {
          const judgeRes = await fetch('/api/ai/judge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              code,
              language,
              problemTitle: activeProblem.title,
              problemDescription: activeProblem.statement,
              problemStatement: activeProblem.statement,
              testResults: data.testResults || data.results || { verdict: data.verdict },
              executionTime: data.time || data.executionTime || 15,
              memoryUsed: data.memory || data.memoryUsed || 14.5,
            }),
          });
          if (judgeRes.ok) {
            const judgeData = await judgeRes.json();
            const reportObj = judgeData.report || judgeData;
            if (reportObj) {
              setJudgeReport(reportObj);
              setIsJudgeModalOpen(true);
            }
          }
        } catch (err) {
          console.error('Judge evaluation error:', err);
        }

        await fetchRoomDetails();
      } else {
        showToast(`Verdict: ${data.verdict || 'Wrong Answer'}`, 'error');
        setLastEvent('SUBMIT_FAILED');
      }
    } catch (err: unknown) {
      showToast('Submission error', 'error');
    } finally {
      setExecuting(false);
    }
  };

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4 p-4">
        <Swords className="w-10 h-10 text-amber-400" />
        <h2 className="text-xl font-bold text-white">Sign In to Battle</h2>
        <p className="text-xs text-slate-400 text-center max-w-xs">You need to be signed in to access battle rooms</p>
        <div className="flex gap-3">
          <Link href="/contests" className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl font-bold">
            Back to Contests
          </Link>
          <Link href="/login" className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs rounded-xl font-bold">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <span className="text-xs font-semibold">Connecting to Battle Room...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <h2 className="text-xl font-bold text-white">Battle Room Not Found</h2>
        <Link href="/contests" className="px-4 py-2 bg-slate-800 text-amber-400 text-xs rounded-xl font-bold">
          Back to Contests
        </Link>
      </div>
    );
  }

  const activeProblem = problems[activeProblemIdx];
  const deadline = room.startedAt ? new Date(room.startedAt).getTime() + room.durationSeconds * 1000 : null;
  const remainingSeconds = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : room.durationSeconds;
  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
  const viewerParticipant = room.participants.find((participant) => participant.userId === currentUserId);
  const winner = room.winnerId ? room.participants.find((participant) => participant.userId === room.winnerId) : null;
  const isHost = hostUserId ? hostUserId === currentUserId : Boolean(user?.name && user.name === room.hostName);

  return (
    <div className="h-[calc(100svh-56px)] min-h-[720px] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      <JudgeScorecardModal isOpen={isJudgeModalOpen} onClose={() => setIsJudgeModalOpen(false)} report={judgeReport} />
      {/* Compact room command bar */}
      <header className="bg-slate-950/95 border-b border-slate-800/80 px-4 sm:px-5 py-3 backdrop-blur-md shrink-0">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={handleLeaveRoom}
            title="Leave Room"
              className="h-9 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/20 shrink-0">
                  <Swords className="w-3 h-3" /> Speed Battle
              </span>
                <h1 className="truncate text-base sm:text-lg font-black text-white">{room.name}</h1>
              </div>
              <p className="text-[11px] text-slate-500 truncate">Host: {room.hostName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="flex h-9 items-center gap-2 px-3 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-[11px] font-bold text-slate-400">CODE:</span>
            <span className="font-mono font-extrabold text-amber-400 text-xs tracking-wider">{roomCode}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label={copiedCode ? 'Room code copied' : 'Copy room code'}
              title="Copy room code"
              className="ml-1 text-slate-400 hover:text-white transition"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

            <div className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{room.participants.length} / {room.maxPlayers} Friends</span>
          </div>

          {room.status === 'WAITING' && (
            <button
              onClick={handleStartBattle}
              disabled={room.mode === 'DUEL' && room.participants.length < 2}
                className="h-9 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/30 transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Flame className="w-4 h-4" /> {room.mode === 'DUEL' && room.participants.length < 2 ? 'Waiting for Opponent' : 'Start Battle'}
            </button>
          )}
          {room.status !== 'WAITING' && (
              <div className={`h-9 px-4 rounded-lg border font-mono text-sm font-black flex items-center gap-2 ${room.status === 'FINISHED' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : remainingSeconds < 60 ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
              <Clock className="w-4 h-4" /> {room.status === 'FINISHED' ? 'MATCH OVER' : `${minutes}:${seconds}`}
            </div>
          )}
          </div>
        </div>
      </header>

      {room.status === 'FINISHED' && (
        <div className="border-b border-amber-500/30 bg-[#111115] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Medal className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-xs uppercase tracking-widest font-black text-amber-400">Final Result</p>
              <p className="text-sm font-bold text-white">{winner ? `${winner.userName} won the duel` : 'Time expired. Review the rankings.'}</p>
            </div>
          </div>
          <div className="text-xs text-slate-400">{viewerParticipant?.acceptedAt ? 'Accepted solution recorded.' : 'Keep the momentum and rematch.'}</div>
        </div>
      )}

      {/* Main Grid: Left Problem & Editor, Right Live Leaderboard */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_330px] overflow-hidden min-h-0">
        {/* Workspace: 3 Columns on Large Screens */}
        <div className="flex flex-col border-r border-slate-800/80 min-w-0 min-h-0">
          {/* Problem Selector Tabs */}
          <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
            {problems.map((p, idx) => {
              const isSolved = solvedProblems[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProblemIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                    activeProblemIdx === idx
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>Q{idx + 1}. {p.title}</span>
                  {isSolved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>

          {/* Problem Statement & Monaco Editor */}
          {activeProblem ? (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(330px,0.82fr)_minmax(520px,1.18fr)] overflow-hidden min-h-0">
              {/* Problem Description */}
              <div className="p-5 space-y-5 overflow-y-auto bg-slate-950/60 min-h-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-black">Problem brief</p>
                    <h2 className="text-xl font-black text-white mt-1">{activeProblem.title}</h2>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    activeProblem.difficulty === 'EASY'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : activeProblem.difficulty === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {activeProblem.difficulty}
                  </span>
                </div>

                <ProblemMarkdown content={activeProblem.statement} size="compact" className="text-slate-300" />

                {(activeProblem.inputFormat || activeProblem.outputFormat || activeProblem.constraints) && (
                  <div className="grid gap-3 border-t border-slate-800/60 pt-4">
                    {activeProblem.inputFormat && (
                      <section>
                        <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Input</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{activeProblem.inputFormat}</p>
                      </section>
                    )}
                    {activeProblem.outputFormat && (
                      <section>
                        <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Output</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{activeProblem.outputFormat}</p>
                      </section>
                    )}
                    {activeProblem.constraints && (
                      <section>
                        <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Constraints</h3>
                        <ProblemMarkdown content={activeProblem.constraints} size="compact" className="mt-1 text-slate-400" />
                      </section>
                    )}
                  </div>
                )}

                {/* Sample Test Case */}
                {activeProblem.testCases?.[0] && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    <div className="text-xs font-bold text-amber-300">Sample Test Case</div>
                    <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-500">Input: </span>
                        <span className="text-slate-200">{activeProblem.testCases[0].input}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expected Output: </span>
                        <span className="text-emerald-400">{activeProblem.testCases[0].expectedOutput}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Code Editor Panel */}
              <div className="flex flex-col border-l border-slate-800/80 bg-slate-900/40 min-h-0">
                {/* Language Selector & Controls */}
                <div className="p-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
                  <select
                    aria-label="Contest programming language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                  >
                    <option value="python">Python 3</option>
                    <option value="cpp">C++</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="go">Go</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunCode}
                      disabled={executing}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-300 border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" /> Run Code
                    </button>
                    <button
                      onClick={handleSubmitCode}
                      disabled={executing}
                      className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      {executing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Submit</span>
                    </button>
                  </div>
                </div>

                {/* Monaco Editor Component */}
                <div className="flex-1 relative min-h-[360px]">
                  <CodeEditor
                    language={language}
                    value={code}
                    onChange={(val) => {
                      const newCode = val || '';
                      setCode(newCode);
                      const lineCount = newCode.split('\n').filter((l) => l.trim().length > 0).length;
                      if (lineCount >= 10 && lineCount % 10 === 0) {
                        setLastEvent('TYPING_PROGRESS');
                      }
                      if (room.status === 'IN_PROGRESS' && viewerParticipant?.progress !== 'CODING') void updateProgress('CODING');
                    }}
                  />
                </div>

                {/* Execution Result Box */}
                {executionResult && (
                  <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs font-mono space-y-2 max-h-40 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400">Execution Output:</span>
                      <span className={`font-bold ${executionResult.verdict === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {executionResult.verdict || 'Completed'}
                      </span>
                    </div>
                    <pre className="text-slate-300 whitespace-pre-wrap font-mono text-[11px]">
                      {executionResult.stdout || executionResult.stderr || JSON.stringify(executionResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">No active problem selected</div>
          )}
        </div>

          {/* Live Leaderboard Sidebar (Max 10 Players) and commentator */}
        <aside className="bg-slate-950/95 border-t xl:border-t-0 border-slate-800/80 p-4 space-y-4 overflow-y-auto min-h-0">
          {/* Live commentator component */}
          <LiveCommentator
            roomCode={roomCode}
            roomName={room.name}
            mode={room.mode}
            status={room.status}
            participants={room.participants}
            problemTitle={activeProblem?.title}
            activeProblemTitle={activeProblem?.title}
            language={language}
            codeSnippet={code}
            linesOfCode={code.split('\n').filter((l) => l.trim().length > 0).length}
            timeRemainingSeconds={remainingSeconds}
            privacyMode
            executionResult={executionResult ?? undefined}
            userName={currentUserName}
            lastEvent={lastEvent}
            eventType={lastEvent}
            className="shadow-none"
          />
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Live Battle Rankings</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
              Max 10
            </span>
          </div>

          <div className="space-y-2">
            {room.participants.map((p, rankIdx) => {
              const isFirst = rankIdx === 0;
              const isSecond = rankIdx === 1;
              const isThird = rankIdx === 2;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-xl border transition flex items-center justify-between ${
                    isFirst
                      ? 'bg-amber-400/10 border-amber-500/50'
                      : isSecond
                      ? 'bg-slate-900/70 border-slate-500/40'
                      : isThird
                      ? 'bg-slate-900/70 border-amber-700/35'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-black font-mono">
                      {isFirst ? <Medal className="w-4 h-4 text-amber-400 mx-auto" aria-label="First place" /> : isSecond ? <Medal className="w-4 h-4 text-slate-300 mx-auto" aria-label="Second place" /> : isThird ? <Medal className="w-4 h-4 text-amber-600 mx-auto" aria-label="Third place" /> : `#${rankIdx + 1}`}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{p.userName}</span>
                        {p.userName === room.hostName && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{p.solved} Solved</span>
                        <span className={`flex items-center gap-1 ${p.progress === 'SOLVED' ? 'text-emerald-400' : p.progress === 'SUBMITTED' ? 'text-amber-400' : p.progress === 'CODING' ? 'text-amber-400' : 'text-slate-500'}`}>
                          <Radio className="w-3 h-3" /> {p.progress === 'WAITING' ? 'Ready' : p.progress.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-amber-400 font-mono">{p.score} pts</div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Room Share & Action Controls Footer */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <p className="text-[11px] text-slate-400">Invite up to 10 friends with code:</p>
            <button
              onClick={handleCopyCode}
              className="w-full py-2 bg-slate-900/70 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono font-bold text-amber-300 flex items-center justify-center gap-2 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copy Invite Code ({roomCode})</span>
            </button>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleLeaveRoom}
                className="w-full py-2 bg-slate-900/70 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Leave Battle Room</span>
              </button>

              {isHost && (
                <button
                  onClick={handleCloseRoom}
                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/35 rounded-lg text-xs font-bold text-rose-300 flex items-center justify-center gap-2 transition"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span>Close & End Room (Host)</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
