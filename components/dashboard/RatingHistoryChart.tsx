'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RatingHistoryItem {
  date: string;
  rating: number;
  delta: number;
  contestTitle: string;
}

interface RatingHistoryChartProps {
  history: RatingHistoryItem[];
  currentRating: number;
}

export function RatingHistoryChart({ history, currentRating }: RatingHistoryChartProps) {
  const ratings = history.map((item) => item.rating);
  const minRating = history.length > 0 ? Math.max(800, Math.min(...ratings) - 100) : 800;
  const maxRating = history.length > 0 ? Math.min(3500, Math.max(...ratings) + 100) : 1000;

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" aria-hidden="true" /> Rating Progression History
          </h3>
          <p className="text-xs text-slate-400">
            Performance over time in CodeForge Rated Contests
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Current Rating</span>
          <div className="text-lg font-bold text-amber-300">{currentRating}</div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="w-full h-64 min-h-[240px] flex-1 mt-2 flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center">
          <p className="text-xs text-slate-500">Join a rated contest to start building your rating history.</p>
        </div>
      ) : (
        <div className="w-full h-64 min-h-[240px] flex-1 mt-2">
          <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis
              domain={[minRating, maxRating]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as RatingHistoryItem;
                  return (
                    <div className="bg-slate-950 border border-slate-700 p-2.5 rounded shadow text-xs">
                      <p className="font-bold text-white">{data.contestTitle}</p>
                      <p className="text-slate-400">{data.date}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-bold text-amber-300">Rating: {data.rating}</span>
                        <span
                          className={`font-semibold ${
                            data.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          ({data.delta >= 0 ? `+${data.delta}` : data.delta})
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={{ fill: '#f59e0b', r: 4 }}
              activeDot={{ r: 6, fill: '#fde68a' }}
            />
          </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
