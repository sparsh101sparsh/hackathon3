'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Code2,
  FileCode,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface TestCaseInput {
  input: string;
  expectedOutput: string;
  explanation?: string;
  isSample?: boolean;
}

interface TemplateInput {
  language: string;
  code: string;
}

export default function EditProblemPage() {
  const router = useRouter();
  const params = useParams();
  const problemId = params?.id as string;
  const { user, loading: authLoading } = useAuth();

  const [isLoadingProblem, setIsLoadingProblem] = useState(true);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [statement, setStatement] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [topicTagsStr, setTopicTagsStr] = useState('');
  const [companyTagsStr, setCompanyTagsStr] = useState('');
  const [editorial, setEditorial] = useState('');
  const [timeLimit, setTimeLimit] = useState(1.0);
  const [memoryLimit, setMemoryLimit] = useState(256);

  const [sampleTestCases, setSampleTestCases] = useState<TestCaseInput[]>([]);
  const [hiddenTestCases, setHiddenTestCases] = useState<TestCaseInput[]>([]);
  const [templates, setTemplates] = useState<TemplateInput[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProblemData = useCallback(async () => {
    if (!problemId || authLoading || user?.role !== 'ADMIN') return;
    setIsLoadingProblem(true);
    try {
      const res = await fetch(`/api/admin/problems/${problemId}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || '');
        setSlug(data.slug || '');
        setStatement(data.statement || '');
        setInputFormat(data.inputFormat || '');
        setOutputFormat(data.outputFormat || '');
        setConstraints(data.constraints || '');
        setDifficulty(data.difficulty?.toUpperCase() || 'EASY');
        setTopicTagsStr(Array.isArray(data.topicTags) ? data.topicTags.join(', ') : '');
        setCompanyTagsStr(Array.isArray(data.companyTags) ? data.companyTags.join(', ') : '');
        setEditorial(data.editorial || '');
        setTimeLimit(data.timeLimit || 1.0);
        setMemoryLimit(data.memoryLimit || 256);

        if (Array.isArray(data.testCases)) {
          const samples = data.testCases.filter((tc: TestCaseInput) => tc.isSample);
          const hiddens = data.testCases.filter((tc: TestCaseInput) => !tc.isSample);
          setSampleTestCases(samples);
          setHiddenTestCases(hiddens);
        }

        if (Array.isArray(data.codeTemplates)) {
          setTemplates(data.codeTemplates);
        }
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to load problem');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading problem detail');
    } finally {
      setIsLoadingProblem(false);
    }
  }, [authLoading, problemId, user?.role]);

  useEffect(() => {
    if (!authLoading && user?.role !== 'ADMIN') router.replace('/');
    fetchProblemData();
  }, [authLoading, fetchProblemData, router, user?.role]);

  const handleAddSampleTC = () => {
    setSampleTestCases((prev) => [...prev, { input: '', expectedOutput: '', explanation: '' }]);
  };

  const handleRemoveSampleTC = (idx: number) => {
    setSampleTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddHiddenTC = () => {
    setHiddenTestCases((prev) => [...prev, { input: '', expectedOutput: '' }]);
  };

  const handleRemoveHiddenTC = (idx: number) => {
    setHiddenTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const topicTags = topicTagsStr.split(',').map((s) => s.trim()).filter(Boolean);
      const companyTags = companyTagsStr.split(',').map((s) => s.trim()).filter(Boolean);

      const payload = {
        title,
        slug,
        statement,
        inputFormat,
        outputFormat,
        constraints,
        difficulty,
        topicTags,
        companyTags,
        editorial,
        timeLimit: Number(timeLimit),
        memoryLimit: Number(memoryLimit),
        sampleTestCases,
        hiddenTestCases,
        codeTemplates: templates,
      };

      const res = await fetch(`/api/admin/problems/${problemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update problem');
        setIsSubmitting(false);
        return;
      }

      router.push('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating problem');
      setIsSubmitting(false);
    }
  };

  if (isLoadingProblem) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans gap-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <span className="text-xs text-slate-400">Loading problem editor...</span>
      </div>
    );
  }

  if (authLoading || user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Edit Problem: {title}</h1>
            <p className="text-xs text-slate-400">Modify metadata, test cases, or starter templates</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            <span>1. Basic Metadata</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Problem Title</label>
              <input
                type="text"
                aria-label="Problem title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">URL Slug</label>
              <input
                type="text"
                aria-label="Problem URL slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Difficulty</label>
              <select
                aria-label="Problem difficulty"
                value={difficulty}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Time Limit (seconds)</label>
              <input
                type="number"
                aria-label="Time limit in seconds"
                step="0.1"
                min="0.1"
                max="10"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Memory Limit (MB)</label>
              <input
                type="number"
                aria-label="Memory limit in megabytes"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Topic Tags (comma-separated)</label>
              <input
                type="text"
                aria-label="Problem topic tags"
                value={topicTagsStr}
                onChange={(e) => setTopicTagsStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Company Tags (comma-separated)</label>
              <input
                type="text"
                aria-label="Problem company tags"
                value={companyTagsStr}
                onChange={(e) => setCompanyTagsStr(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Statement, Format & Editorial */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            <span>2. Problem Description & Editorial</span>
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Problem Statement</label>
            <textarea
              aria-label="Problem statement"
              required
              rows={5}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Input Format</label>
              <textarea
                aria-label="Input format"
                required
                rows={3}
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Output Format</label>
              <textarea
                aria-label="Output format"
                required
                rows={3}
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Constraints</label>
            <textarea
              aria-label="Problem constraints"
              required
              rows={3}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Official Editorial Solution</label>
            <textarea
              aria-label="Official editorial solution"
              rows={4}
              value={editorial}
              onChange={(e) => setEditorial(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Section 3: Test Cases */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              3. Sample Test Cases
            </h2>
            <button
              type="button"
              onClick={handleAddSampleTC}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Sample Case</span>
            </button>
          </div>

          <div className="space-y-4">
            {sampleTestCases.map((tc, idx) => (
              <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 relative">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Sample Case #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSampleTC(idx)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400">Input</label>
                    <textarea
                      aria-label={`Sample case ${idx + 1} input`}
                      rows={2}
                      value={tc.input}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSampleTestCases((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, input: val } : item))
                        );
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Expected Output</label>
                    <textarea
                      aria-label={`Sample case ${idx + 1} expected output`}
                      rows={2}
                      value={tc.expectedOutput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSampleTestCases((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, expectedOutput: val } : item))
                        );
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400">Explanation (Optional)</label>
                  <input
                    type="text"
                    aria-label={`Sample case ${idx + 1} explanation`}
                    value={tc.explanation || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSampleTestCases((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, explanation: val } : item))
                      );
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Hidden Evaluation Test Cases
            </h2>
            <button
              type="button"
              onClick={handleAddHiddenTC}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Hidden Case</span>
            </button>
          </div>

          <div className="space-y-4">
            {hiddenTestCases.map((tc, idx) => (
              <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 relative">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Hidden Case #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHiddenTC(idx)}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400">Input</label>
                    <textarea
                      aria-label={`Hidden case ${idx + 1} input`}
                      rows={2}
                      value={tc.input}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHiddenTestCases((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, input: val } : item))
                        );
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Expected Output</label>
                    <textarea
                      aria-label={`Hidden case ${idx + 1} expected output`}
                      rows={2}
                      value={tc.expectedOutput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHiddenTestCases((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, expectedOutput: val } : item))
                        );
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-emerald-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Starter Code Templates */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>4. Starter Code Templates</span>
          </h2>

          <div className="space-y-4">
            {templates.map((tmpl, idx) => (
              <div key={tmpl.language} className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {tmpl.language} Starter Code
                </label>
                <textarea
                  aria-label={`${tmpl.language} starter code`}
                  rows={4}
                  value={tmpl.code}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTemplates((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, code: val } : item))
                    );
                  }}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/admin"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/50 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Problem...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 fill-slate-950" />
                <span>Update Problem</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
