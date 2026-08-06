'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, TrendingUp, Lightbulb, Target, RefreshCw } from 'lucide-react';
import { createLinkedAbortController } from '@/lib/abort';

interface WeeklyReportData {
  summary: string;
  strengths: string[];
  focusAreas: string[];
  recommendations: string[];
  estimatedRatingGain: number;
}

export function WeeklyInsights() {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeControllersRef = useRef<Set<AbortController>>(new Set());

  const fetchReport = async (signal?: AbortSignal) => {
    const manualController = signal ? null : new AbortController();
    if (manualController) activeControllersRef.current.add(manualController);
    const request = createLinkedAbortController(signal || manualController?.signal, 8000);
    const requestSignal = request.signal;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/weekly-report', { signal: requestSignal });
      if (!res.ok) throw new Error('Failed to load weekly insights');
      const data = await res.json();
      setReport(data);
    } catch (err: unknown) {
      if (request.timedOut()) {
        setError('The weekly insights request timed out. Please try again.');
      } else if (!(err instanceof DOMException && err.name === 'AbortError') && !requestSignal.aborted) {
        setError(err instanceof Error ? err.message : 'Error fetching insights');
      }
    } finally {
      request.cleanup();
      if (manualController) activeControllersRef.current.delete(manualController);
      if (!requestSignal.aborted || request.timedOut()) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const activeControllers = activeControllersRef.current;
    fetchReport(controller.signal);
    return () => {
      controller.abort();
      for (const activeController of activeControllers) activeController.abort();
      activeControllers.clear();
    };
  }, []);

  return (
    <div className="rounded-lg bg-[#101114] border border-white/10 p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-300/10 text-amber-100 border border-amber-300/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Weekly Progress Insights
            </h3>
            <p className="text-xs text-slate-500">
              Powered by FreeModel
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Refresh weekly insights"
          onClick={() => fetchReport()}
          disabled={loading}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
          title="Refresh weekly insights"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-200" />
          <p className="text-xs">Analyzing submission patterns and rating trajectory...</p>
        </div>
      )}

      {error && !loading && (
        <div className="py-4 text-center text-xs text-rose-400">
          Failed to load weekly insights. Please try refreshing.
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4 text-xs">
          {/* Executive Summary */}
          <div className="border-l border-amber-300/30 pl-3 text-slate-300 leading-relaxed font-medium">
            &quot;{report.summary}&quot;
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Strengths */}
            <div className="border-l border-emerald-400/30 pl-3">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Key Strengths</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {report.strengths?.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Focus Areas */}
            <div className="border-l border-sky-400/30 pl-3">
              <div className="flex items-center gap-1.5 font-semibold text-sky-300 mb-2">
                <Target className="w-3.5 h-3.5" />
                <span>Focus Areas</span>
              </div>
              <ul className="space-y-1 text-slate-300 list-disc list-inside">
                {report.focusAreas?.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            {/* Recommendations & Estimated Gain */}
            <div className="border-l border-violet-400/30 pl-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-violet-300 mb-2">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Recommendations</span>
                </div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  {report.recommendations?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-slate-400 font-semibold">
                <span>Potential Rating Gain:</span>
                <span className="text-emerald-400 font-bold">
                  +{report.estimatedRatingGain || 45} pts
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
