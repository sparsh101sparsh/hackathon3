'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Volume2, VolumeX, RefreshCw, Radio, Flame, Zap, ShieldAlert, History } from 'lucide-react';

export interface ParticipantInfo {
  id?: string;
  userId?: string;
  name?: string;
  userName?: string;
  score?: number;
  scores?: number;
  solved?: number;
  timeSpent?: number;
  progress?: string;
}

export interface ExecutionResultInfo {
  verdict?: string;
  stdout?: string;
  stderr?: string;
  time?: number;
  memory?: number;
  [key: string]: unknown;
}

export interface CodeAnalysisInfo {
  lineCount: number;
  nonEmptyLineCount: number;
  functionCount: number;
  loopCount: number;
  conditionalCount: number;
  hasInputParsing: boolean;
  hasReturn: boolean;
  hasConsoleOutput: boolean;
  hasTodo: boolean;
  possibleIssue: string;
  phase: string;
  signature: string;
}

export interface LiveCommentatorProps {
  roomCode?: string;
  roomName?: string;
  eventType?: 'JOIN' | 'SUBMIT' | 'LEAD_SWAP' | 'FAST_SUBMISSION' | 'HIGH_SCORE' | 'TICK' | string;
  lastEvent?: string;
  mode?: string;
  status?: string;
  participants?: ParticipantInfo[];
  problemTitle?: string;
  activeProblemTitle?: string;
  language?: string;
  codeSnippet?: string;
  linesOfCode?: number;
  timeRemainingSeconds?: number;
  privacyMode?: boolean;
  executionResult?: ExecutionResultInfo;
  userName?: string;
  className?: string;
}

export interface CommentaryMessage {
  id: string;
  text: string;
  timestamp: number;
  hypeLevel: 'high' | 'medium' | 'low';
  speaker: 'Shoutcaster';
}

/**
 * Normalize commentary before sending it to speech synthesis.
 */
function stripEmojis(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeCommentaryText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const normalized = value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);

  return normalized.length >= 8 ? normalized : fallback;
}

function normalizeHypeLevel(value: unknown): CommentaryMessage['hypeLevel'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
}

function cheapHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function analyzeCodeSnapshot(code: string, language: string): CodeAnalysisInfo {
  const normalizedCode = typeof code === 'string' ? code : '';
  const lines = normalizedCode.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const withoutStrings = normalizedCode
    .replace(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, '""')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const lowerLanguage = language.toLowerCase();
  const functionMatches = withoutStrings.match(/\b(function|def|func)\b|(?:^|\s)[A-Za-z_][\w:<>,\s*&]*\s+[A-Za-z_]\w*\s*\([^;{}]*\)\s*\{/g) || [];
  const loopMatches = withoutStrings.match(/\b(for|while|do)\b/g) || [];
  const conditionalMatches = withoutStrings.match(/\b(if|else\s+if|switch|case)\b/g) || [];
  const hasInputParsing = /\b(input|cin|scanf|readLine|readline|Scanner|BufferedReader|fmt\.Scan|process\.stdin)\b/.test(withoutStrings);
  const hasReturn = /\breturn\b/.test(withoutStrings);
  const hasConsoleOutput = /\b(console\.log|cout|printf|System\.out|print|fmt\.Print)\b/.test(withoutStrings);
  const hasTodo = /\b(TODO|FIXME|placeholder|write your|implement)\b/i.test(normalizedCode);

  let phase = 'drafting';
  if (nonEmptyLines.length >= 35 || (loopMatches.length > 0 && conditionalMatches.length > 1 && hasReturn)) {
    phase = 'implementation';
  }
  if (hasConsoleOutput || hasReturn) {
    phase = nonEmptyLines.length >= 8 ? 'testing-ready' : phase;
  }

  let possibleIssue = 'No obvious issue spotted';
  if (nonEmptyLines.length === 0 || hasTodo) {
    possibleIssue = 'Solution still looks like a placeholder';
  } else if ((lowerLanguage === 'cpp' || lowerLanguage === 'java' || lowerLanguage === 'go') && !hasReturn && !hasConsoleOutput) {
    possibleIssue = 'No return or output path detected yet';
  } else if (nonEmptyLines.length > 10 && loopMatches.length === 0 && conditionalMatches.length === 0) {
    possibleIssue = 'Core branching or iteration is not visible yet';
  } else if (nonEmptyLines.length > 20 && !hasInputParsing && ['cpp', 'java', 'go', 'javascript'].includes(lowerLanguage)) {
    possibleIssue = 'Input parsing is not visible yet';
  }

  return {
    lineCount: Math.min(lines.length, 100_000),
    nonEmptyLineCount: Math.min(nonEmptyLines.length, 100_000),
    functionCount: Math.min(functionMatches.length, 10_000),
    loopCount: Math.min(loopMatches.length, 10_000),
    conditionalCount: Math.min(conditionalMatches.length, 10_000),
    hasInputParsing,
    hasReturn,
    hasConsoleOutput,
    hasTodo,
    possibleIssue,
    phase,
    signature: `${nonEmptyLines.length}:${functionMatches.length}:${loopMatches.length}:${conditionalMatches.length}:${cheapHash(normalizedCode.slice(-2000))}`,
  };
}

export const LiveCommentator: React.FC<LiveCommentatorProps> = ({
  roomCode,
  roomName = 'Battle Arena',
  eventType,
  lastEvent = 'GENERAL',
  mode = 'DUEL',
  status = 'IN_PROGRESS',
  participants = [],
  problemTitle,
  activeProblemTitle,
  language = 'cpp',
  codeSnippet = '',
  linesOfCode = 0,
  timeRemainingSeconds,
  privacyMode = false,
  executionResult,
  userName,
  className = '',
}) => {
  const [currentMessage, setCurrentMessage] = useState<CommentaryMessage>({
    id: 'initial',
    text: ' The shoutcaster is locked in and ready for battle updates!',
    timestamp: Date.now(),
    hypeLevel: 'medium',
    speaker: 'Shoutcaster',
  });
  const [history, setHistory] = useState<CommentaryMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [analysisBeat, setAnalysisBeat] = useState(0);

  const participantsRef = useRef(participants);
  const executionResultRef = useRef(executionResult);
  const linesOfCodeRef = useRef(linesOfCode);
  const userNameRef = useRef(userName);
  const timeRemainingSecondsRef = useRef(timeRemainingSeconds);
  const codeAnalysisRef = useRef<CodeAnalysisInfo>(analyzeCodeSnapshot(codeSnippet, language));
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestSignatureRef = useRef('');
  const analysisBeatRef = useRef(0);
  useEffect(() => {
    participantsRef.current = participants;
    executionResultRef.current = executionResult;
    linesOfCodeRef.current = linesOfCode;
    userNameRef.current = userName;
    timeRemainingSecondsRef.current = timeRemainingSeconds;
  }, [participants, executionResult, linesOfCode, userName, timeRemainingSeconds]);

  const effectiveProblemTitle = problemTitle || activeProblemTitle || 'DSA Challenge';
  const effectiveEvent = eventType || lastEvent || 'TICK';
  const effectiveRoomCode = roomCode || roomName || 'ARENA-1';
  const participantScoreSignature = useMemo(
    () =>
      participants
        .map((participant) => `${participant.id || participant.userId || participant.name || participant.userName}:${participant.score ?? participant.scores ?? 0}:${participant.solved ?? 0}:${participant.progress || ''}`)
        .join('|'),
    [participants]
  );
  const typingMilestone = Math.floor(Math.max(0, linesOfCode) / 10);
  const executionSignature = `${executionResult?.verdict || ''}:${executionResult?.stderr || ''}`;
  const clockBucket = timeRemainingSeconds === undefined ? 'na' : Math.floor(Math.max(0, timeRemainingSeconds) / 30);
  const codeAnalysis = useMemo(() => analyzeCodeSnapshot(codeSnippet, language), [codeSnippet, language]);
  const codeAnalysisSignature = codeAnalysis.signature;

  useEffect(() => {
    codeAnalysisRef.current = codeAnalysis;
  }, [codeAnalysis]);

  useEffect(() => {
    analysisBeatRef.current = analysisBeat;
  }, [analysisBeat]);

  // Voice Selection setup
  const loadBestVoice = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Prefer English Shoutcaster style voices
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Alex') ||
            v.name.includes('Daniel'))
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    setSelectedVoice(preferredVoice || null);
  }, []);

  useEffect(() => {
    loadBestVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadBestVoice;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.onvoiceschanged === loadBestVoice) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [loadBestVoice]);

  // Speech Cancellation on unmount & mute state change
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isMuted]);

  // TTS Execution helper
  const speakCommentary = useCallback(
    (rawText: string, overrideMuted: boolean = isMuted) => {
      const effectiveMuted = overrideMuted;
      if (effectiveMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const cleanText = stripEmojis(rawText);
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        utterance.rate = 1.1; // Dynamic, fast esports pace
        utterance.pitch = 1.05; // Slightly elevated pitch for hype feel
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[LiveCommentator TTS Warning]:', err);
      }
    },
    [isMuted, selectedVoice]
  );

  // Fetch commentary from API route
  const fetchCommentary = useCallback(
    async (evtOverride?: string) => {
      const targetEvent = evtOverride || effectiveEvent;
      const stateSignature = [
        targetEvent,
        effectiveProblemTitle,
        participantScoreSignature,
        typingMilestone,
        executionSignature,
        targetEvent === 'CODE_ANALYSIS' ? codeAnalysisRef.current.signature : 'analysis',
        targetEvent === 'TICK' ? clockBucket : 'event',
        targetEvent === 'CODE_ANALYSIS' ? analysisBeatRef.current : 'beat',
      ].join('::');

      if (stateSignature === lastRequestSignatureRef.current && targetEvent !== 'MANUAL_REFRESH') return;
      lastRequestSignatureRef.current = stateSignature;
      setLoading(true);

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch('/api/ai/commentator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            roomCode: effectiveRoomCode,
            roomName,
            eventType: targetEvent,
            event: targetEvent,
            participants: participantsRef.current,
            problemTitle: effectiveProblemTitle,
            activeProblemTitle: effectiveProblemTitle,
            language,
            linesOfCode: linesOfCodeRef.current,
            timeRemainingSeconds: timeRemainingSecondsRef.current,
            codeAnalysis: codeAnalysisRef.current,
            executionResult: executionResultRef.current,
            userName: userNameRef.current,
            mode,
            status,
            privacyMode: privacyMode ? 'private_room' : false,
          }),
        });

        if (requestId !== requestIdRef.current) return;

        if (res.ok) {
          const data = await res.json();
          let text = 'Battle action intensifying in the arena!';
          let hype: CommentaryMessage['hypeLevel'] = 'medium';
          let ts = Date.now();

          if (data.commentary) {
            if (typeof data.commentary === 'string') {
              text = normalizeCommentaryText(data.commentary, text);
            } else if (typeof data.commentary === 'object') {
              text = normalizeCommentaryText(data.commentary.text || data.commentary.commentary, text);
            }
          }
          hype = normalizeHypeLevel(data.hypeLevel);
          if (Number.isFinite(data.timestamp)) ts = data.timestamp;

          const msgObj: CommentaryMessage = {
            id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text,
            timestamp: ts,
            hypeLevel: hype,
            speaker: 'Shoutcaster',
          };

          setCurrentMessage(msgObj);
          setHistory((prev) => [msgObj, ...prev.slice(0, 7)]);
          speakCommentary(text);
        } else {
          const analysis = codeAnalysisRef.current;
          const text = targetEvent === 'CODE_ANALYSIS'
            ? `CODE READ: ${userNameRef.current || 'Coder'} has ${analysis.nonEmptyLineCount} active lines; ${analysis.possibleIssue.toLowerCase()}.`
            : 'Battle action continues while the commentator reconnects.';
          const msgObj: CommentaryMessage = {
            id: `comm_local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text,
            timestamp: Date.now(),
            hypeLevel: targetEvent === 'CODE_ANALYSIS' && analysis.possibleIssue !== 'No obvious issue spotted' ? 'medium' : 'low',
            speaker: 'Shoutcaster',
          };
          setCurrentMessage(msgObj);
          setHistory((prev) => [msgObj, ...prev.slice(0, 7)]);
          speakCommentary(text);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('[LiveCommentator Error]:', err);
          const analysis = codeAnalysisRef.current;
          const text = targetEvent === 'CODE_ANALYSIS'
            ? `CODE READ: ${userNameRef.current || 'Coder'} is in ${analysis.phase} with ${analysis.nonEmptyLineCount} active lines.`
            : 'Battle action continues while the commentator reconnects.';
          const msgObj: CommentaryMessage = {
            id: `comm_recover_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            text,
            timestamp: Date.now(),
            hypeLevel: 'low',
            speaker: 'Shoutcaster',
          };
          setCurrentMessage(msgObj);
          setHistory((prev) => [msgObj, ...prev.slice(0, 7)]);
          speakCommentary(text);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      effectiveRoomCode,
      roomName,
      effectiveEvent,
      effectiveProblemTitle,
      language,
      mode,
      status,
      privacyMode,
      speakCommentary,
      participantScoreSignature,
      typingMilestone,
      executionSignature,
      clockBucket,
    ]
  );

  // Trigger fetch on event or prop changes
  useEffect(() => {
    fetchCommentary(effectiveEvent);
  }, [
    fetchCommentary,
    effectiveEvent,
    effectiveProblemTitle,
    participantScoreSignature,
    typingMilestone,
    executionSignature,
    clockBucket,
  ]);

  useEffect(() => {
    if (status !== 'IN_PROGRESS') return;
    const interval = setInterval(() => {
      setAnalysisBeat((beat) => beat + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== 'IN_PROGRESS') return;
    if (codeAnalysis.nonEmptyLineCount === 0) return;
    fetchCommentary('CODE_ANALYSIS');
  }, [
    analysisBeat,
    codeAnalysisSignature,
    codeAnalysis.nonEmptyLineCount,
    fetchCommentary,
    status,
  ]);

  // Periodic interval tick
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCommentary('TICK');
    }, 20000); // 20-second shoutcaster ticker

    return () => clearInterval(interval);
  }, [fetchCommentary]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  const toggleTTS = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (!nextMute && currentMessage.text) {
      speakCommentary(currentMessage.text, false);
    }
  };

  // Dynamic styling based on hype level
  const getHypeBadgeProps = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return {
          label: 'HIGH HYPE',
          bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          icon: <Flame className="w-3.5 h-3.5 animate-bounce text-rose-400" />,
          glow: 'bg-amber-400/10',
        };
      case 'medium':
        return {
          label: 'MEDIUM HYPE',
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          icon: <Zap className="w-3.5 h-3.5 animate-pulse text-amber-400" />,
          glow: 'bg-amber-400/10',
        };
      default:
        return {
          label: 'STEADY HYPE',
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" />,
          glow: 'bg-amber-400/10',
        };
    }
  };

  const hypeProps = getHypeBadgeProps(currentMessage.hypeLevel);

  return (
    <div
      className={`bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5 relative overflow-hidden backdrop-blur-md transition-all ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span>Live Shoutcaster</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${hypeProps.bg}`}
            >
              {hypeProps.icon}
              <span>{hypeProps.label}</span>
            </span>
            {privacyMode && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                <ShieldAlert className="w-3 h-3" />
                <span>PRIVATE</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Button Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Recent History Toggle */}
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            aria-label={showHistory ? 'Hide commentary history' : 'Show commentary history'}
            title="View Commentary History"
            className={`p-1.5 rounded-lg text-xs font-bold transition border ${
              showHistory
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* TTS Audio Toggle Button */}
          <button
            onClick={toggleTTS}
            title={isMuted ? 'Unmute Voice Commentary' : 'Mute Voice Commentary'}
            className={`p-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5 ${
              !isMuted
                ? 'bg-amber-400/10 border-amber-400 text-amber-300 shadow-md shadow-amber-950/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {!isMuted ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              </>
            )}
          </button>

          {/* Refresh Commentary Button */}
          <button
            onClick={() => fetchCommentary('MANUAL_REFRESH')}
            disabled={loading}
            aria-label="Refresh live commentary"
            title="Trigger Fresh Callout"
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Animated Ticker Box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMessage.id}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="text-xs font-semibold text-slate-100 leading-relaxed bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex items-start gap-2.5 relative"
        >
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0 mt-0.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span className="font-bold text-amber-400/90">SPEAKER: {currentMessage.speaker}</span>
              <span>{new Date(currentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <p className="font-sans text-amber-50/90 font-medium">{currentMessage.text}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Optional History Log Panel */}
      {showHistory && history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-slate-800 space-y-2 max-h-36 overflow-y-auto pr-1"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Commentary Log</p>
          {history.map((item) => (
            <div key={item.id} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-300 flex items-start gap-2">
              <span className="text-amber-400 font-mono text-[10px] shrink-0">{new Date(item.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}</span>
              <span className="flex-1 text-slate-300 font-sans">{item.text}</span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
