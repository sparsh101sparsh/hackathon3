'use client';

import React from 'react';
import { CheckCircle2, Flame, Award, Clock } from 'lucide-react';
import { RatingTier } from '@/lib/rating';

interface SolvedSummaryProps {
  user: {
    name: string;
    avatar: string;
    rating: number;
    ratingTier: RatingTier;
    streak: number;
  };
  solved: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
    totalEasy: number;
    totalMedium: number;
    totalHard: number;
  };
  accuracy: number;
  avgTime: {
    easy: string;
    medium: string;
    hard: string;
  };
}

export function SolvedSummaryCards({ user, solved, accuracy, avgTime }: SolvedSummaryProps) {
  const totalSystemProblems = solved.totalEasy + solved.totalMedium + solved.totalHard;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px rounded-lg border border-white/10 overflow-hidden bg-white/10">
      {/* 1. Rating & Tier Badge Card */}
      <div className="bg-[#101114] p-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Contest Rating
          </span>
          <Award className={`w-5 h-5 ${user.ratingTier.colorClass}`} />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold tracking-tight ${user.ratingTier.colorClass}`}>
            {user.rating}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${user.ratingTier.badgeBg} ${user.ratingTier.badgeText}`}>
            {user.ratingTier.badge}
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            <span>Active Streak</span>
          </div>
          <span className="font-bold text-slate-200">{user.streak} Days</span>
        </div>
      </div>

      {/* 2. Total Solved Progress Card */}
      <div className="bg-[#101114] p-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Problems Solved
          </span>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            {solved.total}
          </span>
          <span className="text-xs text-slate-400">
            / {totalSystemProblems} solved
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(solved.easy / Math.max(1, solved.total)) * 100}%` }}
            title={`Easy: ${solved.easy}`}
          />
          <div
            className="bg-sky-400 h-full transition-all duration-500"
            style={{ width: `${(solved.medium / Math.max(1, solved.total)) * 100}%` }}
            title={`Medium: ${solved.medium}`}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${(solved.hard / Math.max(1, solved.total)) * 100}%` }}
            title={`Hard: ${solved.hard}`}
          />
        </div>

        <div className="mt-3 text-xs text-slate-400 flex justify-between">
          <span>Overall Completion</span>
          <span className="font-semibold text-slate-200">
            {Math.round((solved.total / Math.max(1, totalSystemProblems)) * 100)}%
          </span>
        </div>
      </div>

      {/* 3. Difficulty Breakdown Card */}
      <div className="bg-[#101114] p-6 relative overflow-hidden">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Difficulty Breakdown
        </span>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-2">
            <div className="text-xs font-medium text-emerald-400">Easy</div>
            <div className="text-lg font-bold text-emerald-300">{solved.easy}</div>
            <div className="text-[10px] text-slate-400">/{solved.totalEasy}</div>
          </div>
          <div className="bg-sky-950/30 border border-sky-800/35 rounded-lg p-2">
            <div className="text-xs font-medium text-sky-300">Med</div>
            <div className="text-lg font-bold text-sky-200">{solved.medium}</div>
            <div className="text-[10px] text-slate-400">/{solved.totalMedium}</div>
          </div>
          <div className="bg-rose-950/40 border border-rose-800/40 rounded-lg p-2">
            <div className="text-xs font-medium text-rose-400">Hard</div>
            <div className="text-lg font-bold text-rose-300">{solved.hard}</div>
            <div className="text-[10px] text-slate-400">/{solved.totalHard}</div>
          </div>
        </div>
      </div>

      {/* 4. Accuracy & Efficiency Card */}
      <div className="bg-[#101114] p-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Accuracy & Speed
          </span>
          <Clock className="w-5 h-5 text-cyan-200" />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-cyan-100 tracking-tight">
            {accuracy}%
          </span>
          <span className="text-xs text-slate-400">AC Rate</span>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Avg Solve Time:</span>
          <span className="font-semibold text-slate-200">{avgTime.medium} (Med)</span>
        </div>
      </div>
    </div>
  );
}
