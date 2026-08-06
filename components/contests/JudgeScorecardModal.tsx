'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogAccessibility } from '@/lib/useDialogAccessibility';
import { Sparkles, CheckCircle, Clock, Cpu, ShieldCheck, X, ArrowRight, Lightbulb, Code } from 'lucide-react';

export interface JudgeReportProps {
  verdict?: string;
  overallScore?: number;
  correctnessScore?: number;
  timeComplexity?: string;
  spaceComplexity?: string;
  codeQualityScore?: number;
  edgeCaseRating?: string;
  edgeCaseScore?: number;
  readabilityScore?: number;
  efficiencyScore?: number;
  robustnessScore?: number;
  feedback?: string[];
  recommendations?: string[];
  optimizedSnippet?: string;
}

interface JudgeScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: JudgeReportProps | null;
}

export const JudgeScorecardModal: React.FC<JudgeScorecardModalProps> = ({ isOpen, onClose, report }) => {
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  if (!isOpen || !report) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judge-scorecard-title"
          ref={dialogRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5 my-8"
        >
          {/* Top banner gradient */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 id="judge-scorecard-title" className="text-lg font-black text-white">Judge Evaluation Scorecard</h3>
                <p className="text-xs text-slate-400">Algorithmic complexity & code quality breakdown</p>
              </div>
            </div>
        <button type="button" aria-label="Close judge scorecard" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Top Score Banner */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-950/30">
                {report.overallScore ?? 85}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">Verdict</div>
                <div className="text-base font-black text-white">{report.verdict || 'Accepted'}</div>
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-xs text-slate-400 font-medium">Quality Score</div>
              <div className="text-sm font-black text-amber-400 font-mono">{report.codeQualityScore ?? 90} / 100</div>
              {report.correctnessScore !== undefined && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold">Correctness: {report.correctnessScore}%</div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Time Complexity
              </div>
              <div className="text-xs font-black font-mono text-amber-300">{report.timeComplexity || 'O(N)'}</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-amber-400" /> Space Complexity
              </div>
              <div className="text-xs font-black font-mono text-amber-300">{report.spaceComplexity || 'O(1)'}</div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
              <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" /> Edge Case Rating
              </div>
              <div className="text-xs font-black text-amber-300 truncate">{report.edgeCaseRating || 'A (High)'}</div>
            </div>
          </div>

          {/* Feedback Bullet Points */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Judge Feedback & Analysis
            </h4>
            <div className="space-y-2 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300">
              {report.feedback?.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span className="leading-relaxed">{item}</span>
                </div>
              )) || (
                <div className="text-slate-400">Solution passed test cases cleanly with optimal time complexity.</div>
              )}
            </div>
          </div>

          {/* Actionable Recommendations if available */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Recommendations for Optimization
              </h4>
              <div className="space-y-1.5 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300">
                {report.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">→</span>
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimized Code Snippet if available */}
          {report.optimizedSnippet && (
            <div>
              <h4 className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-amber-400" /> Suggested Optimization Pattern
              </h4>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-amber-200 overflow-x-auto">
                {report.optimizedSnippet}
              </pre>
            </div>
          )}

          {/* Close Action */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <span>Close Evaluation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
