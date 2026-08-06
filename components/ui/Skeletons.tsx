'use client';

import React from 'react';

export const ProblemListSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-slate-900/80 border border-slate-800/80 rounded-xl flex items-center justify-between px-6"
        >
          <div className="flex items-center gap-4 w-1/3">
            <div className="w-5 h-5 rounded-full bg-slate-800" />
            <div className="h-4 bg-slate-800 rounded w-48" />
          </div>
          <div className="h-6 w-16 bg-slate-800 rounded-full" />
          <div className="flex gap-2 w-1/4">
            <div className="h-5 w-16 bg-slate-800 rounded" />
            <div className="h-5 w-16 bg-slate-800 rounded" />
          </div>
          <div className="h-8 w-20 bg-slate-800 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-800 rounded" />
            <div className="h-8 w-16 bg-slate-800 rounded" />
            <div className="h-3 w-32 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Weekly insights placeholder */}
      <div className="h-28 bg-slate-900/80 border border-slate-800 rounded-xl p-5" />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-900/80 border border-slate-800 rounded-xl p-5" />
        <div className="h-80 bg-slate-900/80 border border-slate-800 rounded-xl p-5" />
      </div>
    </div>
  );
};

export const ContestScoreboardSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-10 bg-slate-900 border border-slate-800 rounded-t-xl" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-14 bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-center justify-between px-6"
        >
          <div className="flex items-center gap-3 w-1/4">
            <div className="w-6 h-6 rounded bg-slate-800" />
            <div className="h-4 w-24 bg-slate-800 rounded" />
          </div>
          <div className="h-4 w-16 bg-slate-800 rounded" />
          <div className="h-4 w-20 bg-slate-800 rounded" />
          <div className="h-4 w-12 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-800" />
      <div className="h-6 w-3/4 bg-slate-800 rounded" />
      <div className="h-4 w-full bg-slate-800/60 rounded" />
      <div className="h-4 w-5/6 bg-slate-800/60 rounded" />
    </div>
  );
};
