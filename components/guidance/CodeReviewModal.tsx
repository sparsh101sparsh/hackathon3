'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Clock,
  Cpu,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { CodeReviewResponse } from '@/app/api/ai/review/route';
import { TEACHING_STYLE_STORAGE_KEY, getTeachingStyle } from '@/lib/teachingStyles';
import { useDialogAccessibility } from '@/lib/useDialogAccessibility';

interface CodeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  problemId?: string;
  problemTitle: string;
  problemStatement?: string;
  userCode: string;
  language: string;
  verdict?: string;
}

export const CodeReviewModal: React.FC<CodeReviewModalProps> = ({
  isOpen,
  onClose,
  problemId,
  problemTitle,
  problemStatement = '',
  userCode,
  language,
  verdict = 'Accepted',
}) => {
  const [review, setReview] = useState<CodeReviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'refactor' | 'edgecases'>('overview');
  const [copiedRefactor, setCopiedRefactor] = useState<boolean>(false);
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => requestControllerRef.current?.abort();
  }, []);

  const fetchCodeReview = useCallback(async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setIsLoading(true);
    setError(null);
    const teachingStyleId = typeof window !== 'undefined' ? localStorage.getItem(TEACHING_STYLE_STORAGE_KEY) : null;
    const personality = getTeachingStyle(teachingStyleId);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          problemId,
          problemTitle,
          problemStatement,
          userCode,
          language,
          verdict,
          personality: personality.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReview(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to fetch code review');
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Error connecting to review service');
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
  }, [problemId, problemTitle, problemStatement, userCode, language, verdict]);

  useEffect(() => {
    if (!isOpen) {
      requestControllerRef.current?.abort();
      return;
    }
    if (userCode) fetchCodeReview();
  }, [isOpen, userCode, fetchCodeReview]);

  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30';
    if (score >= 70) return 'text-amber-400 border-amber-500/50 bg-amber-950/30';
    if (score >= 50) return 'text-amber-400 border-amber-500/50 bg-amber-950/30';
    return 'text-rose-400 border-rose-500/50 bg-rose-950/30';
  };

  const copyRefactoredCode = () => {
    if (review?.refactoredCode) {
      navigator.clipboard.writeText(review.refactoredCode);
      setCopiedRefactor(true);
      setTimeout(() => setCopiedRefactor(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="code-review-title" className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 id="code-review-title" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Deep Code Review
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                  FreeModel
                </span>
              </h2>
              <p className="text-xs text-slate-400">Analysis for {problemTitle}</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close code review"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3" role="status" aria-live="polite">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin"></div>
                <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto" />
              </div>
              <span className="text-sm text-slate-300 font-medium animate-pulse">
                Analyzing time complexity, edge cases, and code quality...
              </span>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-950/30 border border-rose-900/50 rounded-xl text-center space-y-3" role="alert" aria-live="assertive">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
              <div className="text-sm font-bold text-rose-300">Code Review Failed</div>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                onClick={fetchCodeReview}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 rounded-lg border border-slate-700 transition"
              >
                Retry Analysis
              </button>
            </div>
          ) : review ? (
            <>
              {/* Top Score Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Score Ring */}
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${getScoreColor(review.codeQualityScore)}`}>
                  <div className="relative w-16 h-16 flex items-center justify-center font-extrabold text-2xl">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-amber-400"
                        strokeDasharray={`${review.codeQualityScore}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className="absolute">{review.codeQualityScore}</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
                      Code Quality Score
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {review.codeQualityScore >= 80 ? 'Excellent Logic' : review.codeQualityScore >= 60 ? 'Good Execution' : 'Needs Refactoring'}
                    </div>
                  </div>
                </div>

                {/* Time Complexity Badge */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/60">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase font-sans">
                      Time Complexity
                    </div>
                    <div className="text-base font-extrabold text-amber-400 font-mono">
                      {review.timeComplexity}
                    </div>
                  </div>
                </div>

                {/* Space Complexity Badge */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/60">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase font-sans">
                      Space Complexity
                    </div>
                    <div className="text-base font-extrabold text-amber-400 font-mono">
                      {review.spaceComplexity}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'overview'
                      ? 'bg-slate-800 text-amber-400 border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overview & Strengths
                </button>

                <button
                  onClick={() => setActiveTab('refactor')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'refactor'
                      ? 'bg-slate-800 text-amber-400 border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Refactored Code Comparison
                </button>

                <button
                  onClick={() => setActiveTab('edgecases')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'edgecases'
                      ? 'bg-slate-800 text-amber-400 border border-slate-700'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Missed Edge Cases ({review.missedEdgeCases.length})
                </button>
              </div>

              {/* Tab 1: Overview & Strengths */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Better Approach Recommendation */}
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Optimal Approach Recommendation</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {review.betterApproach}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 bg-emerald-950/10 border border-emerald-900/40 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Code Strengths</span>
                      </div>
                      <ul className="space-y-2">
                        {review.strengths.map((s, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="p-4 bg-rose-950/10 border border-rose-900/40 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Areas for Optimization</span>
                      </div>
                      <ul className="space-y-2">
                        {review.weaknesses.map((w, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Refactored Code Comparison */}
              {activeTab === 'refactor' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Refactored & Clean Version ({language})
                    </span>
                    <button
                      onClick={copyRefactoredCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg border border-slate-700 transition"
                    >
                      {copiedRefactor ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Refactored Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
                    <div>
                      <div className="text-[11px] font-sans font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Original Submission</span>
                        <span className="text-rose-400 font-normal">{review.timeComplexity}</span>
                      </div>
                      <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-slate-300 h-64">
                        {userCode}
                      </pre>
                    </div>

                    <div>
                      <div className="text-[11px] font-sans font-semibold text-emerald-400 mb-1.5 flex items-center justify-between">
                        <span>Refactored Solution</span>
                        <span className="text-emerald-400 font-normal">Optimal Structure</span>
                      </div>
                      <pre className="p-3 bg-slate-950 border border-emerald-900/40 rounded-xl overflow-x-auto text-emerald-300 h-64">
                        {review.refactoredCode}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Missed Edge Cases */}
              {activeTab === 'edgecases' && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Edge Cases to Double Check</span>
                  </div>

                  <div className="space-y-3">
                    {review.missedEdgeCases.map((ec, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start gap-3"
                      >
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-950 text-amber-400 border border-amber-800 shrink-0">
                          Case {idx + 1}
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{ec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            aria-label="Close code review"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-lg border border-slate-700 transition"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeReviewModal;
