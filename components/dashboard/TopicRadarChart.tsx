'use client';

import React from 'react';
import { Target } from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from 'recharts';

interface TopicItem {
  topic: string;
  solved: number;
  total: number;
  percentage: number;
}

interface TopicRadarChartProps {
  topics: TopicItem[];
}

export function TopicRadarChart({ topics }: TopicRadarChartProps) {
  const chartData = topics.map((t) => ({
    subject: t.topic,
    mastery: t.percentage,
    solved: t.solved,
    total: t.total,
    fullMark: 100,
  }));

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" aria-hidden="true" /> Topic Mastery Radar
          </h3>
          <p className="text-xs text-slate-400">
            Skill balance across key algorithmic categories
          </p>
        </div>
      </div>

      <div className="w-full h-64 min-h-[240px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-700 p-2.5 rounded shadow text-xs">
                      <p className="font-bold text-white">{data.subject}</p>
                      <p className="text-amber-400">Mastery: {data.mastery}%</p>
                      <p className="text-slate-400">
                        Solved: {data.solved} / {data.total}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Radar
              name="Mastery %"
              dataKey="mastery"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
