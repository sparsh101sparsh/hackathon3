'use client';

import React from 'react';
import { Lock, CheckCircle2, Trophy } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
}

interface BadgesGridProps {
  badges: Badge[];
}

export function BadgesGrid({ badges }: BadgesGridProps) {
  const getBadgeBorder = (tier: string, unlocked: boolean) => {
    if (!unlocked) return 'border-slate-800 bg-slate-950/40 opacity-60';
    switch (tier) {
      case 'Bronze':
        return 'border-amber-700/60 bg-amber-950/20 text-amber-400';
      case 'Silver':
        return 'border-slate-600/60 bg-slate-900/60 text-slate-300';
      case 'Gold':
        return 'border-yellow-600/60 bg-yellow-950/20 text-yellow-400';
      case 'Platinum':
        return 'border-emerald-600/60 bg-emerald-950/20 text-emerald-400';
      case 'Diamond':
        return 'border-amber-400/50 bg-amber-400/10 text-amber-300';
      case 'Master':
        return 'border-amber-300/60 bg-amber-300/10 text-amber-200 font-bold';
      default:
        return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" /> Achievement Badges & Milestones
          </h3>
          <p className="text-xs text-slate-400">
            Unlock ranks from Bronze to Master by solving problems & competing
          </p>
        </div>
        <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-lg">
          {badges.filter((b) => b.unlocked).length} / {badges.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`p-3.5 rounded-lg border flex items-start gap-3 transition-all ${getBadgeBorder(
              badge.tier,
              badge.unlocked
            )}`}
          >
            <div className="text-2xl p-2 rounded-md bg-slate-900/80 border border-slate-800 shrink-0">
              <Trophy className="w-5 h-5" aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white truncate">{badge.name}</h4>
                {badge.unlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </div>

              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{badge.description}</p>

              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="font-semibold uppercase tracking-wider opacity-80">
                  {badge.tier} Tier
                </span>
                {badge.unlocked ? (
                  <span className="text-emerald-400 font-medium">Unlocked</span>
                ) : (
                  <span className="text-slate-500">{badge.progress || 0}% Progress</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
