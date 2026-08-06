'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Lock, Unlock, ChevronDown, ChevronUp, Loader2, Lightbulb } from 'lucide-react';
import { HintResponse } from '@/app/api/ai/hints/route';
import { TEACHING_STYLE_STORAGE_KEY } from '@/lib/teachingStyles';

interface ProgressiveHintsProps {
  problemId?: string;
  problemTitle: string;
  problemStatement?: string;
  userCode?: string;
  language?: string;
}

export const ProgressiveHints: React.FC<ProgressiveHintsProps> = ({
  problemId,
  problemTitle,
  problemStatement = '',
  userCode = '',
  language = 'cpp',
}) => {
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);
  const [hints, setHints] = useState<{ [key: number]: HintResponse }>({});
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<{ [key: number]: boolean }>({ 1: true, 2: true, 3: true });
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => requestControllerRef.current?.abort();
  }, []);

  const unlockHint = async (level: 1 | 2 | 3) => {
    if (hints[level]) {
      setUnlockedLevel(Math.max(unlockedLevel, level));
      return;
    }

    setLoadingLevel(level);
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const teachingStyleId = typeof window !== 'undefined' ? localStorage.getItem(TEACHING_STYLE_STORAGE_KEY) : null;
      const res = await fetch('/api/ai/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          problemId,
          problemTitle,
          problemStatement,
          userCode,
          language,
          hintLevel: level,
          personality: teachingStyleId,
        }),
      });

      if (res.ok) {
        const data: HintResponse = await res.json();
        setHints((prev) => ({ ...prev, [level]: data }));
        setUnlockedLevel(Math.max(unlockedLevel, level));
      }
    } catch (err) {
      if (!controller.signal.aborted) console.error('Error unlocking hint:', err);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        if (!controller.signal.aborted) setLoadingLevel(null);
      }
    }
  };

  const toggleExpand = (level: number) => {
    setExpandedLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  };

  const levelConfigs = [
    {
      level: 1 as const,
      name: 'Level 1: Intuition',
      badgeColor: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
      description: 'High-level conceptual direction & intuition',
    },
    {
      level: 2 as const,
      name: 'Level 2: Algorithm & Data Structures',
      badgeColor: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
      description: 'Data structure suggestions & algorithmic approach',
    },
    {
      level: 3 as const,
      name: 'Level 3: Detailed Logic & Pseudocode',
      badgeColor: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
      description: 'Step-by-step pseudo-code & structural logic',
    },
  ];

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>3-Level Progressive Hints</span>
        </div>
        <span className="text-[11px] text-slate-400">Powered by FreeModel</span>
      </div>

      <div className="space-y-3">
        {levelConfigs.map(({ level, name, badgeColor, description }) => {
          const isUnlocked = unlockedLevel >= level;
          const hintData = hints[level];
          const isLoading = loadingLevel === level;
          const isExpanded = expandedLevels[level];

          return (
            <div
              key={level}
              className={`border rounded-xl transition-all overflow-hidden ${
                isUnlocked
                  ? 'bg-slate-900/80 border-slate-800 shadow-md'
                  : 'bg-slate-950/50 border-slate-800/60 opacity-90'
              }`}
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${badgeColor}`}
                  >
                    {name}
                  </div>
                  {!isUnlocked && (
                    <span className="text-xs text-slate-500 hidden sm:inline">{description}</span>
                  )}
                </div>

                <div>
                  {isUnlocked ? (
                    <button
                      onClick={() => toggleExpand(level)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => unlockHint(level)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 transition disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-amber-300" />
                          <span>Unlock Hint</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Unlocked Hint Body */}
              {isUnlocked && isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-800/80 pt-3 space-y-2">
                  {hintData ? (
                    <>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>{hintData.title}</span>
                      </div>
                      <pre className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line bg-slate-950 p-3 rounded-lg border border-slate-800/60">
                        {hintData.hint}
                      </pre>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 italic">Click unlock to generate hint content.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressiveHints;
