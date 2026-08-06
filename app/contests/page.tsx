'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Users, ArrowRight, Zap, Swords, Plus, KeyRound, Bot, Star } from 'lucide-react';
import { ContestScoreboardSkeleton } from '@/components/ui/Skeletons';
import { CreateRoomModal } from '@/components/contests/CreateRoomModal';
import { JoinRoomModal } from '@/components/contests/JoinRoomModal';
import { OnDemandContestModal } from '@/components/contests/OnDemandContestModal';

interface ContestItem {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  isRated: boolean;
  status: 'ACTIVE' | 'UPCOMING' | 'ENDED';
  problemCount: number;
  participantCount: number;
  isRegistered: boolean;
}

export default function ContestsPage() {
  const [contests, setContests] = useState<ContestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isOnDemandModalOpen, setIsOnDemandModalOpen] = useState(false);

  const fetchContests = async () => {
    try {
      const res = await fetch('/api/contests', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch contests');
      const data = await res.json();
      setContests(data.contests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const activeContests = contests.filter((c) => c.status === 'ACTIVE');
  const endedContests = contests.filter((c) => c.status === 'ENDED');

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#08080a] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto font-sans"
    >
      {/* Modals */}
      <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <JoinRoomModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
      <OnDemandContestModal isOpen={isOnDemandModalOpen} onClose={() => setIsOnDemandModalOpen(false)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-lg shadow-amber-950/20">
              <Trophy className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              CodeForge Contests & Friend Battles
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Start a rated battle when you are ready, invite friends, and get judged on the work you submit.
          </p>
        </div>
      </div>

      {/* On-demand arena */}
      <div className="rounded-lg bg-[#0f0f12] border border-white/10 p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
              <Bot className="w-3.5 h-3.5" /> On-demand rated arena
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Start a battle. Get a rating.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              The AI judge scores correctness, completion speed, and problem difficulty after every run. Use a bot duel for a solo rating attempt or create a private room for up to 10 players.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setIsOnDemandModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-xs sm:text-sm shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" aria-hidden="true" /> Start rated battle</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-xs sm:text-sm shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Private Room</span>
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#111115] hover:bg-[#18181d] text-slate-200 border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Join Room</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <ContestScoreboardSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Active Live Contests */}
          {activeContests.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Contests In Progress
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {activeContests.map((contest) => (
                  <motion.div
                    key={contest.id}
                    whileHover={{ scale: 1.01 }}
                    className="rounded-xl bg-[#0f0f12] border border-white/10 shadow-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          Live Now
                        </span>
                        {contest.isRated && (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20 uppercase">
                            Rated
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white">{contest.title}</h3>
                      <p className="text-xs text-slate-400 max-w-2xl">{contest.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          {contest.participantCount} registered
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          {contest.problemCount} Problems
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/contests/${contest.id}`}
                        className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-xs sm:text-sm shadow-lg shadow-amber-400/20 transition-all flex items-center gap-2"
                      >
                        <span>Enter Contest</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Past Contests */}
          {endedContests.length > 0 && (
            <section className="space-y-4 pt-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Recent battle results
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {endedContests.map((contest) => (
                  <div
                    key={contest.id}
                    className="rounded-xl bg-[#0f0f12] border border-white/10 shadow-xl p-6 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-white">{contest.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ended on {new Date(contest.endTime).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/contests/${contest.id}`}
                      className="px-4 py-2 rounded-lg bg-[#111115] hover:bg-[#18181d] text-slate-200 border border-white/10 font-semibold text-xs transition-all"
                    >
                      View Results
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </motion.div>
  );
}
