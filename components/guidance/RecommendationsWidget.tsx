'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, RefreshCw, Zap, Target, BookOpen } from 'lucide-react';
import { DailyRecommendation } from '@/app/api/ai/recommendations/route';
import { TEACHING_STYLE_STORAGE_KEY } from '@/lib/teachingStyles';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';

export const RecommendationsWidget: React.FC = () => {
  const [recommendations, setRecommendations] = useState<DailyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const teachingStyleId = typeof window !== 'undefined' ? localStorage.getItem(TEACHING_STYLE_STORAGE_KEY) : '';
      const url = teachingStyleId ? `/api/ai/recommendations?personality=${teachingStyleId}` : '/api/ai/recommendations';
      const res = await fetch(url, { signal });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      } else {
        setError('Failed to fetch recommendations');
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendations(controller.signal);

    return () => controller.abort();
  }, []);

  const getDifficultyBadge = (difficulty: string) => {
    return <DifficultyBadge difficulty={difficulty} />;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400">
            <Sparkles className="w-5 h-5 fill-amber-400/20" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Today&apos;s Recommended DSA Practice
              <span className="px-2 py-0.2 text-[9px] uppercase font-bold rounded bg-amber-950 text-amber-400 border border-amber-800">
                FreeModel
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Targeted selection based on your progress history</p>
          </div>
        </div>

        <button
          onClick={() => fetchRecommendations()}
          disabled={isLoading}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          title="Refresh recommendations"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Recommendations Feed */}
      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
          <span>Curating 3 personalized problem recommendations...</span>
        </div>
      ) : error || recommendations.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          No recommendations available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-3 transition shadow-md group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {getDifficultyBadge(item.difficulty)}
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-950 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>{item.targetSkill}</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition leading-snug">
                  {item.title}
                </h4>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans line-clamp-3">
                  &quot;{item.aiReason}&quot;
                </p>
              </div>

              <Link
                href={`/problems/${item.id}`}
                className="inline-flex items-center justify-between w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-semibold rounded-lg border border-slate-800 transition"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Solve Problem</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendationsWidget;
