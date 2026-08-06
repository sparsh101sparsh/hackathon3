'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Sparkles,
  Play,
  CheckCircle2,
  Cpu,
  Clock,
  Zap,
  Terminal,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

const SAMPLE_CODES: Record<string, string> = {
  python: `def two_sum(nums: list[int], target: int) -> list[int]:
    """Find indices of two numbers that add up to target."""
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

# Test execution with Judge0 Code Engine
print(two_sum([2, 7, 11, 15], 9))  # Output: [0, 1]`,

  cpp: `#include <vector>
#include <unordered_map>
#include <iostream>

std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int diff = target - nums[i];
        if (seen.count(diff)) return {seen[diff], i};
        seen[nums[i]] = i;
    }
    return {};
}`,

  javascript: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
};

export const MonacoPreviewDemo: React.FC = () => {
  const [lang, setLang] = useState<'python' | 'cpp' | 'javascript'>('cpp');
  const [activeTab, setActiveTab] = useState<'code' | 'review'>('code');
  const [isExecuting, setIsExecuting] = useState(false);
  const [verdict, setVerdict] = useState<string | null>(null);

  const handleRun = () => {
    setIsExecuting(true);
    setVerdict(null);
    setTimeout(() => {
      setIsExecuting(false);
      setVerdict('ACCEPTED — 4ms • 14.2 MB (Judge0 Code Engine)');
    }, 800);
  };

  return (
    <section className="py-12 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/50 text-amber-300 text-xs font-semibold mb-3">
          <Terminal className="w-3.5 h-3.5" />
          <span>Interactive Editor Preview</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Multi-Language Monaco Editor & Code Audit
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mt-2">
          Experience real-time code execution with Judge0 and instant deep-dive complexity analysis.
        </p>
      </div>

      {/* Editor and review container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        {/* Card Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* File Tab & Language Selector */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
              {(['python', 'cpp', 'javascript'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-md transition ${
                    lang === l
                      ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {l === 'cpp' ? 'C++' : l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle code and review preview */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition ${
                  activeTab === 'code'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Monaco Code</span>
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition ${
                  activeTab === 'review'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Code Review Modal</span>
              </button>
            </div>

            <button
              onClick={handleRun}
              disabled={isExecuting}
              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-950/50 flex items-center gap-1.5 transition"
            >
              {isExecuting ? (
                <Cpu className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-slate-950" />
              )}
              <span>{isExecuting ? 'Executing...' : 'Run Code'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 relative min-h-[300px]">
          <AnimatePresence mode="wait">
            {activeTab === 'code' ? (
              <motion.div
                key="code-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 font-mono text-xs sm:text-sm leading-relaxed"
              >
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto text-slate-200">
                  <pre>{SAMPLE_CODES[lang]}</pre>
                </div>

                {verdict && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{verdict}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-mono">Judge0 CE</span>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="review-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Review header */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-950/40 border border-amber-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-900/60 text-amber-300 border border-amber-700/60">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Code Review Report</h4>
                      <p className="text-xs text-amber-300">Generated by FreeModel</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                    Optimal Solution: 98/100
                  </span>
                </div>

                {/* Complexity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Time Complexity</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-amber-300">O(N)</div>
                    <p className="text-[11px] text-slate-400">Single hash map lookup pass per element.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>Space Complexity</span>
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-300">O(N)</div>
                    <p className="text-[11px] text-slate-400">Hash map stores up to N key-value pairs.</p>
                  </div>
                </div>

                {/* Code Suggestion Box */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>Optimization & Clean Code Feedback</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Great choice using a hash map to achieve <code className="text-amber-400 font-mono">O(N)</code> time complexity instead of brute force <code className="text-rose-400 font-mono">O(N²)</code> nested loops!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
};
