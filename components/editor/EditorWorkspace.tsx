'use client';

import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from './CodeEditor';
import {
  Play,
  Send,
  RotateCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Loader2,
  Code2,
  Sparkles,
  Brain,
} from 'lucide-react';
import { ExecuteApiResponse, SubmissionApiResponse, TestCaseResult } from '@/lib/types';
import CodeReviewModal from '@/components/guidance/CodeReviewModal';
import TutorDrawer from '@/components/guidance/TutorDrawer';
import { useAuth } from '@/context/AuthContext';

interface CodeTemplateItem {
  id?: string;
  language: string;
  code: string;
}

interface SampleTestCaseItem {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string | null;
}

interface EditorWorkspaceProps {
  problemId?: string;
  problemTitle?: string;
  problemStatement?: string;
  codeTemplates?: CodeTemplateItem[];
  sampleTestCases?: SampleTestCaseItem[];
  onSubmissionSuccess?: () => void;
}

const LANGUAGES = [
  { id: 'python', label: 'Python 3', defaultCode: 'import sys\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()' },
  { id: 'cpp', label: 'C++', defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}' },
  { id: 'javascript', label: 'JavaScript', defaultCode: 'const fs = require("fs");\n\nfunction main() {\n}\n\nmain();' },
  { id: 'java', label: 'Java', defaultCode: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n    }\n}' },
  { id: 'go', label: 'Go', defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n}' },
];

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  problemId,
  problemTitle = 'DSA Problem',
  problemStatement = '',
  codeTemplates = [],
  sampleTestCases = [],
  onSubmissionSuccess,
}) => {
  const { user } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('cpp');
  const [code, setCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'testcases' | 'results' | 'custom'>('testcases');
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');
  const [useCustomInput, setUseCustomInput] = useState<boolean>(false);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [executeResult, setExecuteResult] = useState<ExecuteApiResponse | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionApiResponse | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState<number>(256);
  const [tutorWidth, setTutorWidth] = useState<number>(400);
  const codeRef = useRef<string>('');
  const appliedTemplateRef = useRef<{ language: string; code: string } | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Load a template when entering a language, but never overwrite edits when
  // the parent refreshes problem data and creates a new templates array.
  useEffect(() => {
    const tmpl = codeTemplates.find(
      (t) => t.language.toLowerCase() === selectedLanguage.toLowerCase()
    );
    const nextCode = tmpl?.code || LANGUAGES.find((l) => l.id === selectedLanguage)?.defaultCode || '';
    const previous = appliedTemplateRef.current;
    const enteredLanguage = previous?.language !== selectedLanguage;
    const templateChanged = previous?.language === selectedLanguage && previous.code !== nextCode;
    const editorIsUntouched = codeRef.current === '' || codeRef.current === previous?.code;

    if (enteredLanguage || (templateChanged && editorIsUntouched)) {
      codeRef.current = nextCode;
      setCode(nextCode);
    }
    appliedTemplateRef.current = { language: selectedLanguage, code: nextCode };
  }, [selectedLanguage, codeTemplates]);

  // Set default custom input from sample test case
  useEffect(() => {
    if (sampleTestCases.length > 0 && !customInput) {
      setCustomInput(sampleTestCases[0].input);
    }
  }, [sampleTestCases, customInput]);

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
  };

  const handleResetCode = () => {
    const tmpl = codeTemplates.find(
      (t) => t.language.toLowerCase() === selectedLanguage.toLowerCase()
    );
    const nextCode = tmpl?.code || LANGUAGES.find((l) => l.id === selectedLanguage)?.defaultCode || '';
    codeRef.current = nextCode;
    setCode(nextCode);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveTab('results');
    setSubmissionResult(null);
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language: selectedLanguage,
          code,
          customInput: useCustomInput ? customInput : undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setExecuteResult(data);
      } else {
        setExecuteResult({
          verdict: 'Runtime Error',
          stdout: '',
          stderr: data.error || 'Execution failed',
          executionTime: 0,
          memory: 0,
        });
      }
    } catch (err: unknown) {
      setExecuteResult({
        verdict: 'Runtime Error',
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Execution error',
        executionTime: 0,
        memory: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!problemId) {
      handleRunCode();
      return;
    }

    if (!user) {
      setSubmissionResult({
        verdict: 'Runtime Error',
        passedCount: 0,
        totalCount: 0,
        executionTime: 0,
        memory: 0,
        testResults: [],
        failedTestCase: { input: '', expectedOutput: '', actualOutput: '', error: 'Sign in to save submissions and progress.' },
      });
      setActiveTab('results');
      return;
    }

    setIsSubmitting(true);
    setActiveTab('results');
    setExecuteResult(null);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          problemId,
          language: selectedLanguage,
          code,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSubmissionResult(data);
        setIsReviewModalOpen(true);
        if (data.verdict === 'Accepted' && onSubmissionSuccess) {
          onSubmissionSuccess();
        }
      } else {
        setSubmissionResult({
          verdict: 'Runtime Error',
          passedCount: 0,
          totalCount: 0,
          executionTime: 0,
          memory: 0,
          testResults: [],
          failedTestCase: {
            input: '',
            expectedOutput: '',
            actualOutput: '',
            error: data.error || 'Submission failed',
          },
        });
      }
    } catch (err: unknown) {
      setSubmissionResult({
        verdict: 'Runtime Error',
        passedCount: 0,
        totalCount: 0,
        executionTime: 0,
        memory: 0,
        testResults: [],
        failedTestCase: {
          input: '',
          expectedOutput: '',
          actualOutput: '',
          error: err instanceof Error ? err.message : 'Submission error',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentVerdict = submissionResult?.verdict || executeResult?.verdict;

  const handleBottomResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!workspaceRef.current) return;

    const workspace = workspaceRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rect = workspace.getBoundingClientRect();
      const nextHeight = rect.bottom - moveEvent.clientY;
      const maxHeight = Math.max(160, rect.height - 260);
      setBottomPanelHeight(Math.min(maxHeight, Math.max(140, nextHeight)));
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

  const handleBottomResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!workspaceRef.current || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;

    event.preventDefault();
    const maxHeight = Math.max(160, workspaceRef.current.getBoundingClientRect().height - 260);
    const direction = event.key === 'ArrowUp' ? 1 : -1;
    setBottomPanelHeight((current) => Math.min(maxHeight, Math.max(140, current + direction * 16)));
  };

  const handleTutorResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!workspaceRef.current) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const nextWidth = rect.right - moveEvent.clientX;
      const maxWidth = Math.max(250, rect.width - 300); // 300px min for editor
      setTutorWidth(Math.min(maxWidth, Math.max(250, nextWidth)));
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

  const handleTutorResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!workspaceRef.current || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;

    event.preventDefault();
    const maxWidth = Math.max(250, workspaceRef.current.getBoundingClientRect().width - 300);
    const direction = event.key === 'ArrowRight' ? -1 : 1;
    setTutorWidth((current) => Math.min(maxWidth, Math.max(250, current + direction * 16)));
  };

  return (
    <div ref={workspaceRef} className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Bar / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800 backdrop-blur-sm">
        {/* Language Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <Code2 className="w-4 h-4 text-amber-300" />
            <span>Language:</span>
          </div>
          <select
            aria-label="Programming language"
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-[#111115] text-slate-200 border border-white/10 text-xs rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCode}
            title="Reset code to default template"
            className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 font-semibold text-xs transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            )}
            <span>Run Code</span>
          </button>

          <button
            onClick={() => setIsReviewModalOpen(true)}
            title="Get a code review"
            className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 font-semibold text-xs transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Code Review</span>
          </button>

          <button
            onClick={handleSubmitCode}
            disabled={isRunning || isSubmitting}
            className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-xs sm:text-sm shadow-lg shadow-amber-400/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 fill-slate-950" />
            )}
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 relative min-h-[300px] flex overflow-hidden">
        <div className="min-w-0 flex-1">
          <CodeEditor
            language={selectedLanguage}
            value={code}
            onChange={(val) => {
              codeRef.current = val;
              setCode(val);
            }}
            onRun={handleRunCode}
            onSubmit={handleSubmitCode}
          />
        </div>
        {isTutorOpen && (
          <div
            aria-label="Resize tutor panel"
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={handleTutorResizeStart}
            onKeyDown={handleTutorResizeKeyDown}
            className="w-2 shrink-0 cursor-col-resize bg-slate-950 border-x border-slate-800 hover:bg-amber-400/10 focus:bg-amber-400/10 focus:outline-none z-40 transition-colors"
          />
        )}
        <TutorDrawer
          variant="side-panel"
          problemId={problemId}
          problemTitle={problemTitle}
          problemStatement={problemStatement}
          userCode={code}
          language={selectedLanguage}
          isOpen={isTutorOpen}
          width={tutorWidth}
          onToggle={() => setIsTutorOpen((current) => !current)}
        />
      </div>

      <div
        aria-label="Resize editor and test panel"
        role="separator"
        aria-orientation="horizontal"
        tabIndex={0}
        onPointerDown={handleBottomResizeStart}
        onKeyDown={handleBottomResizeKeyDown}
        className="h-2 shrink-0 cursor-row-resize bg-slate-950 border-y border-slate-800 hover:bg-amber-400/10 focus:bg-amber-400/10 focus:outline-none"
      />

      {/* Bottom Panel (Test Cases & Results) */}
      <div
        className="flex shrink-0 flex-col bg-slate-950"
        style={{ height: `${bottomPanelHeight}px` }}
      >
        {/* Panel Tabs Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('testcases')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'testcases'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Testcases</span>
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'custom'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Custom Input</span>
              {useCustomInput && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('results')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'results'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Test Results</span>
              {currentVerdict && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                    currentVerdict === 'Accepted'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {currentVerdict}
                </span>
              )}
            </button>
          </div>

          {/* Quick Info / Shortcut Hint */}
          <div className="text-[11px] text-slate-500 hidden sm:block">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">
              Cmd/Ctrl + Enter
            </kbd>{' '}
            Run |{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">
              Cmd/Ctrl + Shift + Enter
            </kbd>{' '}
            Submit
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
          {/* TAB 1: Sample Testcases */}
          {activeTab === 'testcases' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {sampleTestCases.map((tc, idx) => (
                  <button
                    key={tc.id || idx}
                    onClick={() => setSelectedTestCaseIndex(idx)}
                    className={`px-3 py-1 text-xs rounded-md border transition ${
                      selectedTestCaseIndex === idx
                        ? 'bg-[#17171b] border-amber-400/50 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    Case {idx + 1}
                  </button>
                ))}
              </div>

              {sampleTestCases.length > 0 && (
                <div className="space-y-2">
                  <div>
                    <div className="text-slate-400 text-[11px] mb-1 font-sans font-semibold">
                      Input:
                    </div>
                    <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-md text-slate-200 overflow-x-auto">
                      {sampleTestCases[selectedTestCaseIndex]?.input}
                    </pre>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[11px] mb-1 font-sans font-semibold">
                      Expected Output:
                    </div>
                    <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-md text-emerald-400 overflow-x-auto">
                      {sampleTestCases[selectedTestCaseIndex]?.expectedOutput}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Custom Input */}
          {activeTab === 'custom' && (
            <div className="space-y-2 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 text-xs font-sans font-semibold flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useCustomInput}
                    onChange={(e) => setUseCustomInput(e.target.checked)}
                    className="rounded border-white/10 bg-[#17171b] text-amber-400 focus:ring-amber-400"
                  />
                  <span>Enable Custom Input for Execution</span>
                </label>
              </div>

              <textarea
                aria-label="Custom standard input"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setUseCustomInput(true);
                }}
                placeholder="Enter custom input standard input (stdin)..."
                rows={4}
                className="w-full flex-1 p-2.5 bg-[#111115] border border-white/10 rounded-md text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none font-mono text-xs"
              />
            </div>
          )}

          {/* TAB 3: Results Panel */}
          {activeTab === 'results' && (
            <div className="space-y-3">
              {isRunning || isSubmitting ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-300" />
                  <span className="text-xs font-sans">
                    {isSubmitting ? 'Evaluating against all test cases...' : 'Executing code...'}
                  </span>
                </div>
              ) : submissionResult ? (
                /* Submission Result Display */
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      {submissionResult.verdict === 'Accepted' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <div>
                        <div
                          className={`text-sm font-bold font-sans ${
                            submissionResult.verdict === 'Accepted'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {submissionResult.verdict}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          Passed {submissionResult.passedCount} / {submissionResult.totalCount} test cases
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span>{submissionResult.executionTime}s</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-stone-400" />
                        <span>{submissionResult.memory} MB</span>
                      </div>
                    </div>
                  </div>

                  {submissionResult.learning && (
                    <div className="flex items-start gap-2 p-3 bg-amber-400/5 border border-amber-400/20 rounded-lg">
                      <Brain className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-amber-100/80 font-sans">
                        <span className="font-bold text-amber-300">Revision Deck updated.</span>{' '}
                        This {submissionResult.learning.pattern} mistake is due for review now and will be shown with the failing case.
                      </div>
                    </div>
                  )}

                  {submissionResult.failedTestCase && (
                    <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-lg space-y-2">
                      <div className="text-xs font-bold text-rose-400 font-sans">
                        Failed Test Case Details:
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px] font-sans">Input:</div>
                        <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-slate-200 text-xs overflow-x-auto">
                          {submissionResult.failedTestCase.input}
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px] font-sans">Expected Output:</div>
                        <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-emerald-400 text-xs overflow-x-auto">
                          {submissionResult.failedTestCase.expectedOutput}
                        </pre>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px] font-sans">Actual Output:</div>
                        <pre className="p-2 bg-slate-900 rounded border border-slate-800 text-rose-300 text-xs overflow-x-auto">
                          {submissionResult.failedTestCase.actualOutput || submissionResult.failedTestCase.error}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : executeResult ? (
                /* Run Code Execution Result Display */
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900/90 border border-slate-800 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      {executeResult.verdict === 'Accepted' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                      <div>
                        <div
                          className={`text-sm font-bold font-sans ${
                            executeResult.verdict === 'Accepted'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {executeResult.verdict}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          Custom Run Execution
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span>{executeResult.executionTime}s</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-stone-400" />
                        <span>{executeResult.memory} MB</span>
                      </div>
                    </div>
                  </div>

                  {executeResult.stdout && (
                    <div>
                      <div className="text-slate-400 text-[11px] mb-1 font-sans font-semibold">
                        Standard Output (stdout):
                      </div>
                      <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-md text-emerald-400 overflow-x-auto">
                        {executeResult.stdout}
                      </pre>
                    </div>
                  )}

                  {executeResult.stderr && (
                    <div>
                      <div className="text-slate-400 text-[11px] mb-1 font-sans font-semibold text-rose-400">
                        Standard Error (stderr):
                      </div>
                      <pre className="p-2.5 bg-slate-900 border border-rose-900/50 rounded-md text-rose-300 overflow-x-auto">
                        {executeResult.stderr}
                      </pre>
                    </div>
                  )}

                  {executeResult.learning && (
                    <div className="flex items-start gap-2 p-3 bg-amber-400/5 border border-amber-400/20 rounded-lg">
                      <Brain className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-amber-100/80 font-sans">
                        <span className="font-bold text-amber-300">Revision Deck learned this stuck point.</span>{' '}
                        Your {executeResult.learning.failureType} on {executeResult.learning.pattern} is due for review now with the failing run details.
                      </div>
                    </div>
                  )}

                  {executeResult.testResults && executeResult.testResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-slate-300 text-xs font-semibold font-sans">
                        Sample Test Case Results:
                      </div>
                      {executeResult.testResults.map((tr, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-md border text-xs font-mono ${
                            tr.passed
                              ? 'bg-emerald-950/10 border-emerald-900/40 text-emerald-300'
                              : 'bg-rose-950/10 border-rose-900/40 text-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 font-sans font-medium">
                            <span>Case {idx + 1}</span>
                            <span>{tr.passed ? ' Passed' : ' Failed'}</span>
                          </div>
                          <div>Expected: {tr.expectedOutput}</div>
                          <div>Actual: {tr.actualOutput}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 font-sans text-xs">
                  Run your code or submit to see detailed output and verdicts.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Code review modal */}
      <CodeReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        problemId={problemId}
        problemTitle={problemTitle}
        problemStatement={problemStatement}
        userCode={code}
        language={selectedLanguage}
        verdict={currentVerdict || 'Accepted'}
      />
    </div>
  );
};

export default EditorWorkspace;
