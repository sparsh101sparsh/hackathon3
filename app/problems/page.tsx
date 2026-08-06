'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Search,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { Problem } from '@/lib/types';
import { ProblemListSkeleton } from '@/components/ui/Skeletons';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';

const TOPIC_OPTIONS = [
  'All Topics',
  'Arrays',
  'Hash Table',
  'Linked List',
  'Math',
  'Two Pointers',
  'Binary Search',
  'Sliding Window',
  'Dynamic Programming',
  'Stack',
  'Queue',
  'Tree',
  'Graph',
  'Heap',
  'Trie',
  'Backtracking',
  'Greedy',
  'Bit Manipulation',
];

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('All Topics');
  const [visualizedOnly, setVisualizedOnly] = useState<boolean>(false);

  // Set of 75 visualizer problem IDs
  const [visualizerMap, setVisualizerMap] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch('/data/visualizers.json')
      .then((res) => res.json())
      .then((data) => {
        if (data) setVisualizerMap(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchProblems = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const visualizerIds = Object.keys(visualizerMap);
      const visualizerFilterActive = selectedDifficulty === 'VISUALIZED' || visualizedOnly;
      if (visualizerFilterActive && visualizerIds.length === 0) {
        setProblems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');

      if (searchTerm) params.set('search', searchTerm);
      if (!visualizerFilterActive) params.set('visualizedFirst', 'true');
      if (selectedDifficulty !== 'ALL' && selectedDifficulty !== 'VISUALIZED') {
        params.set('difficulty', selectedDifficulty);
      }
      if (selectedTopic !== 'All Topics') params.set('topic', selectedTopic);
      if (visualizerFilterActive) params.set('ids', visualizerIds.join(','));

      const res = await fetch(`/api/problems?${params.toString()}`, { signal });
      if (res.ok) {
        const data = await res.json();
        const fetchedProblems: Problem[] = data.problems || [];

        setProblems(fetchedProblems);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Error loading problems:', error);
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [page, searchTerm, selectedDifficulty, selectedTopic, visualizedOnly, visualizerMap]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchProblems(controller.signal);
    return () => controller.abort();
  }, [fetchProblems]);

  const handleDifficultyChange = (diff: string) => {
    setSelectedDifficulty(diff);
    if (diff === 'VISUALIZED') {
      setVisualizedOnly(true);
    } else {
      setVisualizedOnly(false);
    }
    setPage(1);
  };

  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
    setPage(1);
  };

  const getDifficultyBadge = (difficulty: string) => {
    return <DifficultyBadge difficulty={difficulty} />;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Filter Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm shadow-lg"
        >
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              aria-label="Search problems"
              placeholder="Search problem title or keywords..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-[#08080a] border border-white/10 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium transition"
            />
          </div>

          {/* Difficulty & Visualized Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 flex-wrap">
            {['ALL', 'EASY', 'MEDIUM', 'HARD', 'VISUALIZED'].map((diff) => (
              <button
                key={diff}
                onClick={() => handleDifficultyChange(diff)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                  selectedDifficulty === diff
                    ? diff === 'VISUALIZED'
                      ? 'bg-amber-400/10 text-amber-300 border border-amber-400/40 shadow'
                      : 'bg-[#17171b] text-amber-200 shadow border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {diff === 'VISUALIZED' ? (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Visualized (75)</span>
                  </>
                ) : diff === 'ALL' ? (
                  'All'
                ) : (
                  diff.charAt(0) + diff.slice(1).toLowerCase()
                )}
              </button>
            ))}
          </div>

          {/* Topic Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              aria-label="Filter problems by topic"
              value={selectedTopic}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="bg-[#08080a] text-slate-200 border border-white/10 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
            >
              {TOPIC_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Problems Table */}
        {isLoading ? (
          <ProblemListSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">Status</th>
                    <th className="py-3.5 px-6">Problem Title</th>
                    <th className="py-3.5 px-4 text-center">Difficulty</th>
                    <th className="py-3.5 px-6">Topics</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {problems.length > 0 ? (
                    problems.map((prob) => {
                      const isSolved = false; // Resolved via localStorage
                      const hasVis = !!visualizerMap[prob.id];

                      return (
                        <tr
                          key={prob.id}
                          className="hover:bg-slate-800/40 transition duration-150 group"
                        >
                          {/* Status Icon */}
                          <td className="py-4 px-4 text-center">
                            {isSolved ? (
                              <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-700 mx-auto group-hover:text-slate-500 transition" />
                            )}
                          </td>

                          {/* Title & Slug Link */}
                          <td className="py-4 px-6 font-medium text-slate-200">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/problems/${prob.slug}`}
                                className="hover:text-amber-300 transition font-semibold group-hover:translate-x-0.5 transform duration-150"
                              >
                                {prob.title}
                              </Link>
                              {hasVis && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400/10 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-300" />
                                  <span>Animated Visualizer</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Difficulty Badge */}
                          <td className="py-4 px-4 text-center">
                            {getDifficultyBadge(prob.difficulty)}
                          </td>

                          {/* Topic Tags */}
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1.5">
                              {prob.topicTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
                                >
                                  {tag}
                                </span>
                              ))}
                              {prob.topicTags.length > 3 && (
                                <span className="px-1.5 py-0.5 text-[10px] text-slate-500 font-medium">
                                  +{prob.topicTags.length - 3}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action CTA */}
                          <td className="py-4 px-4 text-right">
                            <Link
                              href={`/problems/${prob.slug}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 hover:border-amber-400/60 transition"
                            >
                              <span>Solve</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                        No problems found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-sm text-slate-400 border-t border-slate-800">
            <div>
              Showing page <span className="font-semibold text-white">{page}</span> of{' '}
              <span className="font-semibold text-white">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
