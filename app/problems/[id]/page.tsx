'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Code2,
  BookOpen,
  HelpCircle,
  History,
  FileText,
  Copy,
  Check,
  ChevronLeft,
  Clock,
  Cpu,
  Sparkles,
} from 'lucide-react';
import EditorWorkspace from '@/components/editor/EditorWorkspace';
import ProgressiveHints from '@/components/guidance/ProgressiveHints';
import { ProblemVisualizer } from '@/components/problems/ProblemVisualizer';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { Problem, Submission } from '@/lib/types';
import { ProblemMarkdown } from '@/components/ui/ProblemMarkdown';

export default function ProblemDetailPage() {
  const params = useParams();
  const problemId = params?.id as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<
    'description' | 'hints' | 'submissions' | 'editorial' | 'visualizer'
  >('description');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(43);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fetch problem details
  const fetchProblem = useCallback(async (signal?: AbortSignal) => {
    if (!problemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/problems/${problemId}?includeEditorial=true`, { signal });
      if (res.ok) {
        const data = await res.json();
        setProblem(data);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load problem');
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Error loading problem');
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [problemId]);

  const loadedProblemId = problem?.id;

  // Fetch submission history for this problem
  const fetchSubmissions = useCallback(async (signal?: AbortSignal) => {
    if (!loadedProblemId) return;
    setIsLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/submissions?problemId=${loadedProblemId}&limit=20`, { signal });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error('Error fetching submissions:', err);
      }
    } finally {
      if (!signal?.aborted) setIsLoadingSubmissions(false);
    }
  }, [loadedProblemId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchProblem(controller.signal);
    return () => controller.abort();
  }, [fetchProblem]);

  useEffect(() => {
    if (activeLeftTab === 'submissions') {
      const controller = new AbortController();
      void fetchSubmissions(controller.signal);
      return () => controller.abort();
    }
    return undefined;
  }, [activeLeftTab, fetchSubmissions]);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleMainResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!workspaceRef.current || window.innerWidth < 1024) return;

    const workspace = workspaceRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rect = workspace.getBoundingClientRect();
      const rawPercentage = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.min(68, Math.max(28, rawPercentage)));
    };

    const stopResize = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  const handleMainResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    setLeftPanelWidth((current) => Math.min(68, Math.max(28, current + direction * 2)));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400 font-medium">Loading problem workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-xl text-center space-y-4 shadow-xl">
          <div className="text-rose-400 font-bold text-lg">Problem Not Found</div>
          <p className="text-sm text-slate-400">{error || 'The requested problem could not be loaded.'}</p>
          <Link
            href="/problems"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#17171b] hover:bg-[#202024] text-amber-300 text-xs font-semibold rounded-lg border border-white/10 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Problems</span>
          </Link>
        </div>
      </div>
    );
  }

  const getDifficultyBadge = (difficulty: string) => {
    return <DifficultyBadge difficulty={difficulty} />;
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Top Workspace Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/problems"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Back to Problems"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">{problem.title}</h1>
            {getDifficultyBadge(problem.difficulty)}
          </div>
        </div>

        {/* Tags */}
        <div className="hidden lg:flex items-center gap-2">
          {problem.topicTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-900 text-slate-300 border border-slate-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* Split Workspace View */}
      <div
        ref={workspaceRef}
        className="problem-workspace-split flex-1 overflow-hidden bg-slate-950"
        style={{ '--problem-left': `${leftPanelWidth}%` } as React.CSSProperties}
      >
        {/* LEFT PANEL: Problem Details & Tabs (5 Columns on Large Screens) */}
        <div className="flex flex-col h-full bg-slate-900/40 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-2 bg-slate-950 border-b border-slate-800 shrink-0">
            <button
              onClick={() => setActiveLeftTab('description')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeLeftTab === 'description'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Description</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('hints')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeLeftTab === 'hints'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Hints</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('submissions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeLeftTab === 'submissions'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Submissions</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('editorial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeLeftTab === 'editorial'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editorial</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('visualizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeLeftTab === 'visualizer'
                  ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-400/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Visualizer</span>
            </button>
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            {/* TAB 1: DESCRIPTION */}
            {activeLeftTab === 'description' && (
              <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
                {/* Statement */}
                <div className="prose prose-invert max-w-none space-y-3">
                  <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold font-sans">
                    Problem Statement
                  </h3>
                  <ProblemMarkdown content={problem.statement} className="text-slate-200 font-normal" />
                </div>

                {/* Input & Output Format */}
                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-amber-300 font-sans uppercase">
                      Input Format
                    </div>
                    <div className="text-xs text-slate-300 font-mono">
                      {problem.inputFormat}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-emerald-400 font-sans uppercase">
                      Output Format
                    </div>
                    <div className="text-xs text-slate-300 font-mono">
                      {problem.outputFormat}
                    </div>
                  </div>
                </div>

                {/* Constraints */}
                <div className="p-3.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-amber-400 font-sans uppercase">
                    Constraints
                  </div>
                  <div className="text-xs text-slate-300 font-mono whitespace-pre-line">
                    {problem.constraints}
                  </div>
                </div>

                {/* Sample Test Cases */}
                {problem.testCases && problem.testCases.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold font-sans">
                      Sample Test Cases
                    </h3>
                    {problem.testCases.map((tc, idx) => (
                      <div
                        key={tc.id || idx}
                        className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300 font-sans">
                            Example {idx + 1}
                          </span>
                          <button
                            onClick={() => copyToClipboard(tc.input, idx)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Input</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-400 mb-1 font-sans">
                            Input:
                          </div>
                          <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto">
                            {tc.input}
                          </pre>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-400 mb-1 font-sans">
                            Output:
                          </div>
                          <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                            {tc.expectedOutput}
                          </pre>
                        </div>

                        {tc.explanation && (
                          <div className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 font-sans">
                            <span className="font-semibold text-slate-300">Explanation: </span>
                            {tc.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: HINTS */}
            {activeLeftTab === 'hints' && (
              <ProgressiveHints
                problemId={problem.id}
                problemTitle={problem.title}
                problemStatement={problem.statement}
              />
            )}

            {/* TAB 3: SUBMISSIONS */}
            {activeLeftTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold font-sans">
                    Submission History
                  </h3>
                  <button
                    onClick={() => void fetchSubmissions()}
                    className="text-xs text-amber-300 hover:underline font-semibold"
                  >
                    Refresh
                  </button>
                </div>

                {isLoadingSubmissions ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Loading submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No submissions recorded yet for this problem.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <div
                            className={`font-bold ${
                              sub.status === 'Accepted'
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {sub.status}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Language: {sub.language} | {new Date(sub.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-slate-400">
                          {sub.executionTime !== null && sub.executionTime !== undefined && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-300" />
                              <span>{sub.executionTime}s</span>
                            </div>
                          )}
                          {sub.memory !== null && sub.memory !== undefined && (
                            <div className="flex items-center gap-1">
                              <Cpu className="w-3.5 h-3.5 text-stone-400" />
                              <span>{sub.memory} MB</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: EDITORIAL */}
            {activeLeftTab === 'editorial' && (
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold font-sans">
                  Solution Editorial & Analysis
                </h3>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm font-sans">
                  <ProblemMarkdown content={problem.editorial || 'No editorial available for this problem.'} />
                </div>
              </div>
            )}

            {/* TAB 5: VISUALIZER */}
            {activeLeftTab === 'visualizer' && (
              <div className="space-y-4">
                <ProblemVisualizer
                  problemId={problem.id}
                  problemTitle={problem.title}
                  topicTags={problem.topicTags}
                  embedded
                />
              </div>
            )}
          </div>
        </div>

        <div
          aria-label="Resize problem and code panels"
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={handleMainResizeStart}
          onKeyDown={handleMainResizeKeyDown}
          className="hidden lg:flex w-2 cursor-col-resize items-center justify-center bg-slate-950 hover:bg-amber-400/10 focus:bg-amber-400/10 focus:outline-none"
        >
          <span className="h-12 w-px rounded-full bg-white/20" />
        </div>

        {/* RIGHT PANEL: Code Editor & Execution Workspace (7 Columns on Large Screens) */}
        <div className="h-full flex flex-col p-3 bg-slate-950 overflow-hidden">
          <EditorWorkspace
            problemId={problem.id}
            problemTitle={problem.title}
            problemStatement={problem.statement}
            codeTemplates={problem.codeTemplates || []}
            sampleTestCases={problem.testCases || []}
            onSubmissionSuccess={() => {
              fetchSubmissions();
            }}
          />
        </div>
      </div>
    </div>
  );
}
