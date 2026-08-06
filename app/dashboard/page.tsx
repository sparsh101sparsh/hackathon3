'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { SolvedSummaryCards } from '@/components/dashboard/SolvedSummaryCards';
import { TopicRadarChart } from '@/components/dashboard/TopicRadarChart';
import { RatingHistoryChart } from '@/components/dashboard/RatingHistoryChart';
import { ActivityCalendar } from '@/components/dashboard/ActivityCalendar';
import { BadgesGrid } from '@/components/dashboard/BadgesGrid';
import { WeeklyInsights } from '@/components/dashboard/WeeklyInsights';
import { TeachingStyleSelector } from '@/components/dashboard/TeachingStyleSelector';
import { DashboardStatsResponse } from '@/app/api/dashboard/stats/route';
import { DashboardSkeleton } from '@/components/ui/Skeletons';
import { LayoutDashboard, Trophy } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats', { credentials: 'include', signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const stats = await res.json();
        setData(stats);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Error loading dashboard');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchStats();

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#08080a] text-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-[#0f0f12] border border-white/10 rounded-lg p-8 max-w-md">
          <h2 className="text-lg font-bold text-rose-400 mb-2">Error Loading Dashboard</h2>
          <p className="text-xs text-slate-400 mb-4">{error || 'Something went wrong.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-200 hover:bg-amber-100 rounded-lg text-xs font-bold text-[#08080a] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-[#08080a] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-7 max-w-7xl mx-auto font-sans"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <Image
            src={data.user.avatar}
            alt={data.user.name}
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-full border-2 border-amber-300/35 bg-[#0f0f12]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Welcome back, {data.user.name}!
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${data.user.ratingTier.badgeBg} ${data.user.ratingTier.badgeText}`}>
                {data.user.ratingTier.badge} ({data.user.rating})
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Track your algorithmic mastery, rating progression, and contest performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/contests"
            className="px-5 py-2.5 rounded-lg bg-amber-200 hover:bg-amber-100 text-[#08080a] font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5"
          >
            <Trophy className="w-4 h-4" />
            <span>Enter Contests</span>
          </Link>
          <Link
            href="/company"
            className="px-4 py-2 rounded-lg bg-[#111115] hover:bg-[#17171b] text-slate-200 border border-white/10 font-semibold text-xs transition-all flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Company Prep</span>
          </Link>
        </div>
      </div>

      {/* 1. Solved Count Summary Cards */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <SolvedSummaryCards
          user={data.user}
          solved={data.solved}
          accuracy={data.accuracy}
          avgTime={data.avgTime}
        />
      </motion.div>

      {/* 2. Teaching style selector */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-lg p-1"
      >
        <TeachingStyleSelector />
      </motion.div>

      {/* 3. Weekly insights */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <WeeklyInsights />
      </motion.div>

      {/* 4. Recharts Section: Topic Radar + Rating Line Chart */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <TopicRadarChart topics={data.topicMastery} />
        <RatingHistoryChart history={data.ratingHistory} currentRating={data.user.rating} />
      </motion.div>

      {/* 5. GitHub-style Activity Streak Calendar */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
        <ActivityCalendar matrix={data.activityMatrix} streak={data.user.streak} />
      </motion.div>

      {/* 6. Achievement Badges Grid */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
        <BadgesGrid badges={data.badges} />
      </motion.div>
    </motion.div>
  );
}
