'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ScoreboardParticipant } from '@/app/api/contests/[id]/leaderboard/route';
import {
  Trophy,
  Clock,
  Code2,
  ListOrdered,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';

interface ContestProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  order: number;
  statement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
}

interface ContestDetail {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isRated: boolean;
  status: string;
  durationSeconds: number;
  remainingSeconds: number;
  participantCount: number;
  isRegistered: boolean;
  problems: ContestProblem[];
}

export default function ContestArenaPage({ params }: { params: Promise<{ id: string }> }) {
  const [routeId, setRouteId] = useState<string | null>(null);
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'problems' | 'scoreboard' | 'submissions'>('problems');
  const [selectedProblem, setSelectedProblem] = useState<ContestProblem | null>(null);

  // Timer countdown state
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Code editor state for submission tab
  const [code, setCode] = useState<string>(
    '# Write your solution here\ndef solve():\n    pass\n'
  );
  const [submitting, setSubmitting] = useState(false);
  const [submissionVerdict, setSubmissionVerdict] = useState<string | null>(null);
  const [scoreAwarded, setScoreAwarded] = useState(0);

  useEffect(() => {
    let cancelled = false;
    params.then(({ id }) => {
      if (!cancelled) setRouteId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!routeId) return;
    async function loadContestData() {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch(`/api/contests/${routeId}`, { credentials: 'include' }),
          fetch(`/api/contests/${routeId}/leaderboard`, { credentials: 'include' }),
        ]);

        if (cRes.ok) {
          const cData = await cRes.json();
          setContest(cData.contest);
          setTimeLeft(cData.contest.remainingSeconds || 7200);
          if (cData.contest.problems?.length > 0) {
            setSelectedProblem(cData.contest.problems[0]);
          }
        }

        if (sRes.ok) {
          const sData = await sRes.json();
          setScoreboard(sData.leaderboard || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadContestData();
  }, [routeId]);

  // Live timer interval
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSimulateSubmit = async () => {
    if (!selectedProblem) return;
    setSubmitting(true);
    setSubmissionVerdict(null);
    setScoreAwarded(0);
    try {
      const response = await fetch(`/api/contests/${routeId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          problemId: selectedProblem.id,
          language: 'python',
          code,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmissionVerdict(data.error || 'Submission failed');
        return;
      }

      setSubmissionVerdict(data.verdict);
      setScoreAwarded(data.scoreAwarded || 0);
      const scoreboardResponse = await fetch(`/api/contests/${routeId}/leaderboard`, { credentials: 'include' });
      if (scoreboardResponse.ok) {
        const scoreboardData = await scoreboardResponse.json();
        setScoreboard(scoreboardData.leaderboard || []);
      }
    } catch (error) {
      console.error('Contest submission failed:', error);
      setSubmissionVerdict('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm">Connecting to Contest Arena...</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md">
          <h2 className="text-lg font-bold text-rose-400">Contest Not Found</h2>
          <Link href="/contests" className="mt-4 inline-block text-xs font-bold text-amber-400 hover:underline">
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Contest Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm">
        <div>
          <Link href="/contests" className="text-xs text-amber-400 flex items-center gap-1 mb-2 hover:underline">
            <ChevronLeft className="w-4 h-4" />
            Back to Contests List
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{contest.title}</h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              {contest.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{contest.description}</p>
        </div>

        {/* Live Timer Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center shrink-0 min-w-[160px]">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            Remaining Time
          </span>
          <div className="text-xl font-mono font-extrabold text-emerald-400 mt-1">
            {formatTimer(timeLeft)}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('problems')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'problems'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Problem Set</span>
        </button>

        <button
          onClick={() => setActiveTab('scoreboard')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'scoreboard'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Real-time Scoreboard</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'submissions'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Live Arena Code Editor</span>
        </button>
      </div>

      {/* TAB 1: Problems List & Detail */}
      {activeTab === 'problems' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Problem Selector Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Contest Problem Set ({contest.problems?.length || 4})
            </h3>
            {contest.problems?.map((p, idx) => {
              const pointValues = [100, 250, 500, 1000];
              const pts = p.points || pointValues[idx % 4];
              const isSelected = selectedProblem?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProblem(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500/80 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      Problem {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {pts} pts
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{p.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span className="capitalize">{p.difficulty.toLowerCase()}</span>
                    <Link
                      href={`/problems/${p.slug}`}
                      className="text-amber-400 font-semibold hover:underline"
                    >
                      Solve in Workspace →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Problem Detail Column */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 backdrop-blur-sm">
            {selectedProblem ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedProblem.title}</h2>
                    <span className="text-xs text-amber-400 font-semibold">
                      Points: {selectedProblem.points || 250} pts
                    </span>
                  </div>
                  <Link
                    href={`/problems/${selectedProblem.slug}`}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Open Problem Workspace
                  </Link>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div>
                    <h4 className="font-bold text-slate-200 mb-1">Problem Statement</h4>
                    <p className="whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                      {selectedProblem.statement ||
                        'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-200 mb-1">Input Format</h4>
                    <p className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                      {selectedProblem.inputFormat || 'First line contains integer N followed by array values.'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-200 mb-1">Constraints</h4>
                    <p className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                      {selectedProblem.constraints || '2 <= N <= 10^5, -10^9 <= nums[i] <= 10^9'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400">Select a problem from the left list to view statement.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Real-time Scoreboard */}
      {activeTab === 'scoreboard' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Live Contest Scoreboard
            </h3>
            <span className="text-xs text-slate-400">Updates live on submission</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4 text-center">Total Score</th>
                  <th className="py-3 px-4 text-center">Penalty Time</th>
                  <th className="py-3 px-4 text-center">Problem A</th>
                  <th className="py-3 px-4 text-center">Problem B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scoreboard.map((user) => (
                  <tr key={user.userId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {user.rank}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={user.avatar}
                          alt={user.name}
                          width={28}
                          height={28}
                          unoptimized
                          className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800"
                        />
                        <span className="font-bold text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${user.ratingTier.colorClass}`}>
                        {user.rating} ({user.ratingTier.badge})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-amber-400 text-sm">
                      {user.totalScore}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">
                      {user.penaltyTime}m
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        +100 (8m)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                        +250 (24m)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Code Editor Arena */}
      {activeTab === 'submissions' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              Submit Solution to Contest
            </h3>
            <button
              onClick={handleSimulateSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Submit Code</span>
            </button>
          </div>

          <textarea
            aria-label="Contest solution code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={12}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />

          {submissionVerdict && (
            <div role={submissionVerdict === 'Accepted' ? 'status' : 'alert'} aria-live={submissionVerdict === 'Accepted' ? 'polite' : 'assertive'} aria-atomic="true" className={`p-3 rounded-lg flex items-center gap-2 text-xs font-bold ${
              submissionVerdict === 'Accepted'
                ? 'bg-emerald-950/50 border border-emerald-700/60 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-700/60 text-rose-300'
            }`}>
              {submissionVerdict === 'Accepted' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span>Verdict: {submissionVerdict}{scoreAwarded > 0 ? `! +${scoreAwarded} points added to your scoreboard.` : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
