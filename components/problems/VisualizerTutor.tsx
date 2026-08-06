'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Bot, User, Send, Sparkles, Loader2 } from 'lucide-react';
import { getTeachingStyle, TEACHING_STYLE_STORAGE_KEY } from '@/lib/teachingStyles';
import type { LessonFrame } from './ProblemVisualizer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface VisualizerTutorProps {
  currentFrame: LessonFrame | null;
  problemTitle: string;
  step: number;
  totalSteps: number;
  frameKey: string;
}

function GuideAvatar({ avatar, name, size = 32 }: { avatar: string; name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-slate-950/80 border border-white/10 overflow-hidden flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <Bot className="w-4 h-4 text-amber-400" aria-label={name} />
      )}
    </div>
  );
}

export function VisualizerTutor({ currentFrame, problemTitle, step, totalSteps, frameKey }: VisualizerTutorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const personality = getTeachingStyle(
    typeof window !== 'undefined' ? localStorage.getItem(TEACHING_STYLE_STORAGE_KEY) : null
  );

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hi! I'm your visualizer guide, ${personality.name}. I can explain ${problemTitle} step-by-step from the currently synced frame.`,
      },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemTitle]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const framePayload = useMemo(() => (
    currentFrame
      ? {
          frameKey,
          visualType: currentFrame.visualType,
          codeLine: currentFrame.codeLine,
          commentary: currentFrame.commentary,
          state: currentFrame.state,
          active: currentFrame.active,
          pointers: currentFrame.pointers,
          values: currentFrame.values,
          matrix: currentFrame.matrix,
          stack: currentFrame.stack,
          nodes: currentFrame.nodes,
          edges: currentFrame.edges,
          bars: currentFrame.bars,
          bits: currentFrame.bits,
        }
      : null
  ), [currentFrame, frameKey]);

  const phase = currentFrame?.state.find((item) => item.label === 'phase')?.value || `step ${step + 1}`;

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: trimmedInput }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch('/api/ai/visualizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          problemTitle,
          currentFrame: framePayload,
          frameKey,
          step,
          totalSteps,
          messages: newMessages,
          personality: personality.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Oops, I encountered an error analyzing the visualizer state. Try again!' },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: error instanceof DOMException && error.name === 'AbortError' ? 'The guide took too long to respond. The current frame is still available; please try again.' : 'Network error. Please try again.' },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800/80 font-sans">
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900">
        <GuideAvatar avatar={personality.avatar} name={personality.name} />
        <div>
          <div className="text-sm font-bold text-slate-100">{personality.name} Guide</div>
          <div className="text-[10px] text-amber-400 flex items-center gap-1 uppercase tracking-wider font-semibold">
            <Sparkles className="w-3 h-3 text-amber-400" /> Synced to frame
          </div>
        </div>
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] bg-slate-950/50">
        {currentFrame && (
          <div key={frameKey} className="rounded-xl border border-amber-400/30 bg-[#111115] p-3 mb-4 space-y-2 shadow-sm shadow-amber-950/20">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              <span>Step {step + 1} / {totalSteps}</span>
              <span className="text-slate-400">Line {currentFrame.codeLine}</span>
            </div>
            <div className="text-[11px] font-sans font-semibold text-slate-100">{phase}</div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">{currentFrame.commentary}</p>
            {currentFrame.state && currentFrame.state.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-800/60">
                {currentFrame.state.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
                    <span className="text-slate-400 uppercase">{item.label}:</span>
                    <span className="text-amber-300 font-semibold">{item.value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm ${
                msg.role === 'user'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-400/20'
              }`}
            >
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-amber-400" />
                : <GuideAvatar avatar={personality.avatar} name={personality.name} size={28} />
              }
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-400/10 text-amber-100 border border-amber-400/30 shadow-sm shadow-amber-950/20 rounded-tr-none font-medium'
                  : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3" role="status" aria-live="polite" aria-label="Visualizer tutor is thinking">
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-400/20">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-800/80 bg-slate-900">
        <div className="relative flex items-center">
          <input
            aria-label="Ask about the current visualization"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
            placeholder="Ask about this step..."
            maxLength={2000}
            className="w-full bg-slate-800/90 border border-slate-700/80 rounded-full pl-4 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
            disabled={isLoading}
          />
          <button
            type="button"
            aria-label="Send visualizer question"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 p-1.5 rounded-full bg-amber-400 text-slate-950 disabled:opacity-40 disabled:bg-slate-800 disabled:text-slate-500 transition hover:bg-amber-300 hover:shadow-amber-950/30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
