'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Menu, Search, X } from 'lucide-react';
import { ProblemVisualizer } from '@/components/problems/ProblemVisualizer';
import visualizerData from '../../public/data/visualizers.json';

interface VisualizerEntry {
  problemId: string;
  pattern: string;
  lessonPath: string;
  hasVisualizer: boolean;
  slug?: string;
}

const patternLabels: Record<string, string> = {
  'two-pointers': 'Two Pointers',
  'arrays-hashing': 'Arrays & Hashing',
  'sliding-window': 'Sliding Window',
  stack: 'Stack',
  'linked-list': 'Linked List',
  heap: 'Heap',
  'binary-search': 'Binary Search',
  dfs: 'Depth-First Search',
  bfs: 'Breadth-First Search',
  graphs: 'Graphs',
  dp: 'Dynamic Programming',
  backtracking: 'Backtracking',
  greedy: 'Greedy',
  intervals: 'Intervals',
  'prefix-sum': 'Prefix Sum',
  matrices: 'Matrix Traversal',
  'bit-manipulation': 'Bit Manipulation',
};

function titleFromPath(path: string) {
  const slug = path.split('/').pop() || 'algorithm';
  return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const catalogEntries = Object.values(visualizerData) as VisualizerEntry[];

export default function VisualizerLibraryPage() {
  const [entries] = useState<VisualizerEntry[]>(catalogEntries);
  const [problemMeta, setProblemMeta] = useState<Record<string, { title: string; slug: string }>>({});
  const [selectedId, setSelectedId] = useState(catalogEntries[0]?.problemId || '');
  const [query, setQuery] = useState('');
  const [pattern, setPattern] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const ids = entries.map((entry) => entry.problemId).join(',');
    const controller = new AbortController();
    fetch(`/api/problems?ids=${encodeURIComponent(ids)}&limit=100`, { signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : { problems: [] }))
      .then((data) => {
        if (controller.signal.aborted) return;
        const titleMap = Object.fromEntries(
          (data.problems || []).map((problem: { id: string; title: string; slug: string }) => [problem.id, { title: problem.title, slug: problem.slug }]),
        );
        setProblemMeta(titleMap);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setProblemMeta({});
      });
    return () => controller.abort();
  }, [entries]);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const title = problemMeta[entry.problemId]?.title || titleFromPath(entry.lessonPath);
    const matchesQuery = `${title} ${entry.pattern}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (pattern === 'all' || entry.pattern === pattern);
  }), [entries, problemMeta, query, pattern]);

  const selected = entries.find((entry) => entry.problemId === selectedId) || filteredEntries[0];
  const selectedTitle = selected ? (problemMeta[selected.problemId]?.title || titleFromPath(selected.lessonPath)) : 'Choose a lesson';
  const patterns = Array.from(new Set(entries.map((entry) => entry.pattern)));

  const selectLesson = (problemId: string) => {
    setSelectedId(problemId);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (selected && !filteredEntries.some((entry) => entry.problemId === selected.problemId)) {
      setSelectedId(filteredEntries[0]?.problemId || '');
    }
  }, [filteredEntries, selected]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const catalogPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-amber-300 font-bold">Question Menu</div>
          <p className="mt-1 font-sans text-sm text-slate-400">{filteredEntries.length} lessons found</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Close question menu"
          title="Close menu"
          className="rounded-lg border border-white/10 bg-[#111115] p-2 text-slate-200 transition hover:border-amber-400/50 hover:text-amber-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400">
        <Search className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
        <input
          aria-label="Search visualizer lessons"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="search questions..."
          className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
        />
      </div>

      <select
        value={pattern}
        onChange={(event) => setPattern(event.target.value)}
        aria-label="Filter visualizer patterns"
        className="mb-4 w-full rounded-lg border border-white/10 bg-[#111115] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
      >
        <option value="all">All patterns</option>
        {patterns.map((item) => (
          <option key={item} value={item}>{patternLabels[item] || item}</option>
        ))}
      </select>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {filteredEntries.map((entry) => {
          const title = problemMeta[entry.problemId]?.title || titleFromPath(entry.lessonPath);
          const isSelected = entry.problemId === selected?.problemId;
          return (
            <button
              key={entry.problemId}
              type="button"
              onClick={() => selectLesson(entry.problemId)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-300 font-semibold'
                  : 'border-transparent hover:border-white/10 hover:bg-[#18181d]'
              }`}
            >
              <div className="font-sans text-sm leading-snug text-slate-200">{title}</div>
              <div className="mt-1 text-[10px] text-slate-400">{patternLabels[entry.pattern] || entry.pattern}</div>
            </button>
          );
        })}
        {filteredEntries.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-[#111115] p-4 text-sm text-slate-500">
            No lessons match this search.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="h-[calc(100svh-56px)] overflow-hidden bg-[#08080a] text-slate-200 px-3 sm:px-5 lg:px-6 py-3 font-mono">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="visualizer-question-menu"
              title="Open questions"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-sans text-sm font-bold text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/15"
            >
              <Menu className="h-4 w-4" />
              Questions
            </button>
            <div className="min-w-0">
              <div className="retro-label mb-0.5 text-[11px]"><span>$ visualizer --catalog=75</span></div>
              <h1 className="truncate font-mono text-xl sm:text-2xl font-medium tracking-normal phosphor-glow">Watch the algorithm think<span className="text-amber-400">_</span></h1>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-3 sm:flex">
            <div className="text-sm text-slate-400"><span className="text-slate-100 font-bold">{entries.length || 75}</span> verified lessons</div>
            {selected && (
              <Link href={`/problems/${problemMeta[selected.problemId]?.slug || titleFromPath(selected.lessonPath).toLowerCase().replaceAll(' ', '-')}`} className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 font-semibold">
                Open workspace <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        <section className="min-h-0 min-w-0 flex-1">
          {selected ? <ProblemVisualizer key={selected.problemId} problemId={selected.problemId} problemTitle={selectedTitle} topicTags={JSON.stringify([selected.pattern])} verified={selected.hasVisualizer} compact /> : <div className="border border-slate-800 rounded-2xl p-10 text-center text-slate-500">No lessons match this filter.</div>}
        </section>
      </div>

      <div className={`fixed inset-0 z-50 ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
        <button
          type="button"
          aria-label="Close question menu"
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-black/60 transition-opacity ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          id="visualizer-question-menu"
          className={`absolute left-0 top-0 h-full w-[min(92vw,380px)] border-r border-white/10 bg-[#0f0f12] p-4 shadow-2xl shadow-black/50 transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {catalogPanel}
        </aside>
      </div>
    </main>
  );
}
