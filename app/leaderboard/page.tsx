'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LeaderboardUser } from '@/app/api/leaderboard/route';
import { Trophy, Search, Loader2, Medal } from 'lucide-react';
import { ContestScoreboardSkeleton } from '@/components/ui/Skeletons';

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/leaderboard', { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const data = await res.json();
        setUsers(data.leaderboard || []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) console.error(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchLeaderboard();

    return () => controller.abort();
  }, []);

  const filteredUsers = users.filter(
      (u) =>
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.ratingTier.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(u.rating).includes(searchQuery.trim())
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500/20 border border-yellow-500 text-yellow-400 font-bold text-sm">
          <Medal className="w-4 h-4" aria-hidden="true" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/20 border border-slate-400 text-slate-300 font-bold text-sm">
          <Medal className="w-4 h-4" aria-hidden="true" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 border border-amber-600 text-amber-500 font-bold text-sm">
          <Medal className="w-4 h-4" aria-hidden="true" />
        </span>
      );
    }
    return <span className="text-slate-400 font-mono font-semibold text-sm">#{rank}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#08080a] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-[#111115] text-amber-400 border border-white/10">
              <Trophy className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Global Leaderboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Top competitive programmers ranked by Codeforces-style contest rating & problem counts
          </p>
        </div>

        {/* Search Filter */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search leaderboard users"
            placeholder="Search handle, name, tier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111115] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium transition"
          />
        </div>
      </div>

      {loading ? (
        <ContestScoreboardSkeleton />
      ) : (
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4 font-semibold">User</th>
                  <th className="py-3.5 px-4 font-semibold">Rating / Badge</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Solved (E/M/H)</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Accuracy</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Streak</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Consistency</th>
                  <th className="py-3.5 px-4 font-semibold">Country / Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No leaderboard entries found. Submit code solutions to earn your rank on the global leaderboard!
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center">{getRankBadge(u.rank)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={u.avatar}
                            alt={u.name}
                            width={36}
                            height={36}
                            unoptimized
                            className="w-9 h-9 rounded-full border border-slate-700 bg-slate-800 shrink-0"
                          />
                          <div>
                            <Link href={`/leaderboard/${u.id}`} className="font-bold text-white group-hover:text-amber-300 transition-colors hover:underline">
                              {u.name}
                            </Link>
                            <div className="text-[11px] text-slate-400">{u.ratingTier.badge}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-extrabold text-sm ${u.ratingTier.colorClass}`}
                          >
                            {u.rating}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${u.ratingTier.badgeBg} ${u.ratingTier.badgeText}`}
                          >
                            {u.ratingTier.badge}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-white text-sm">{u.solved.total}</div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 mt-0.5">
                          <span className="text-emerald-400 font-semibold">{u.solved.easy}E</span>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">{u.solved.medium}M</span>
                          <span>•</span>
                          <span className="text-rose-400 font-semibold">{u.solved.hard}H</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-amber-300 text-sm">{u.accuracy}%</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-amber-400 text-sm">{u.streak}d</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-200 text-sm">{u.consistency}%</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-300">{u.country}</div>
                        <div className="text-[10px] text-slate-500">Joined {u.joinedAt}</div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
