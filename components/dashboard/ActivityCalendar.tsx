'use client';

import React from 'react';
import { Flame } from 'lucide-react';

interface ActivityItem {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityCalendarProps {
  matrix: ActivityItem[];
  streak: number;
}

export function ActivityCalendar({ matrix, streak }: ActivityCalendarProps) {
  // Group matrix into weeks (7 days each, total 52 columns)
  const weeks: ActivityItem[][] = [];
  let currentWeek: ActivityItem[] = [];

  matrix.forEach((item, idx) => {
    currentWeek.push(item);
    if (currentWeek.length === 7 || idx === matrix.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const totalSubmissionsYear = matrix.reduce((acc, curr) => acc + curr.count, 0);

  const getLevelColor = (level: 0 | 1 | 2 | 3 | 4) => {
    switch (level) {
      case 1:
        return 'bg-emerald-950 border-emerald-800';
      case 2:
        return 'bg-emerald-700 border-emerald-600';
      case 3:
        return 'bg-emerald-500 border-emerald-400';
      case 4:
        return 'bg-emerald-300 border-emerald-200 shadow-sm shadow-emerald-400/50';
      case 0:
      default:
        return 'bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" aria-hidden="true" /> Submission Activity Calendar
          </h3>
          <p className="text-xs text-slate-400">
            {totalSubmissionsYear} submissions in the past year • {streak} day streak
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-slate-900 border border-slate-800" />
          <span className="w-3 h-3 rounded-sm bg-emerald-950 border border-emerald-800" />
          <span className="w-3 h-3 rounded-sm bg-emerald-700 border border-emerald-600" />
          <span className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-400" />
          <span className="w-3 h-3 rounded-sm bg-emerald-300 border border-emerald-200" />
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="inline-flex gap-1 min-w-[720px]">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  role="img"
                  aria-label={`${day.date}: ${day.count} submissions`}
                  className={`w-3 h-3 rounded-[2px] border transition-transform hover:scale-125 ${getLevelColor(
                    day.level
                  )}`}
                  title={`${day.date}: ${day.count} submissions`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
