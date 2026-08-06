'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Bot, X, Send, Sparkles, User, Loader2, Zap } from 'lucide-react';
import { TEACHING_STYLE_STORAGE_KEY, getTeachingStyle } from '@/lib/teachingStyles';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TutorDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  variant?: 'fixed' | 'side-panel';
  problemId?: string;
  problemTitle: string;
  problemStatement?: string;
  userCode: string;
  language: string;
  width?: number;
}

const QUICK_PROMPTS = [
  'Explain this error or issue',
  'How to optimize time complexity?',
  'What edge cases am I missing?',
  'Give me a hint without giving solution',
];

function TutorAvatar({ avatar, name, size = 28 }: { avatar: string; name: string; size?: number }) {
  return (
    <div
      className="rounded-lg bg-slate-950/80 border border-white/10 overflow-hidden flex items-center justify-center shrink-0"
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
        <Bot className="w-4 h-4" aria-label={name} />
      )}
    </div>
  );
}

export const TutorDrawer: React.FC<TutorDrawerProps> = ({
  isOpen,
  onToggle,
  variant = 'fixed',
  problemId,
  problemTitle,
  problemStatement = '',
  userCode,
  language,
  width,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSidePanel = variant === 'side-panel';

  // Read personality from localStorage
  const personality = getTeachingStyle(
    typeof window !== 'undefined' ? localStorage.getItem(TEACHING_STYLE_STORAGE_KEY) : null
  );

  // Set welcome message based on personality
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I'm your ${personality.name} (${personality.title}). How can I help you tackle "${problemTitle}" today? ${personality.tagline}`,
      },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemTitle]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend || !textToSend.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    if (!customText) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          problemTitle,
          problemStatement,
          userCode,
          language,
          messages: newMessages,
          personality: personality.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || data.message }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: "Sorry, I had trouble reaching the tutor service. Please try asking again!",
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
            content: "Network error connecting to the tutor service. Please check your connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button when Drawer is Closed */}
      {!isOpen && (
        <button
          type="button"
          aria-label="Open DSA tutor"
          onClick={onToggle}
          className={`z-40 flex items-center gap-2 px-4 py-3 bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold rounded-lg shadow-2xl shadow-amber-400/10 transition-all transform hover:scale-105 ${
            isSidePanel ? 'absolute bottom-4 right-4' : 'fixed bottom-6 right-6'
          }`}
        >
          <Sparkles className="w-5 h-5 fill-slate-950" />
          <span className="text-xs tracking-wide font-sans">DSA Tutor</span>
        </button>
      )}

      {/* Drawer Overlay Panel */}
      {isOpen && (
        <div
          className={`z-50 bg-slate-950/95 shadow-2xl flex flex-col backdrop-blur-xl font-sans ${
            isSidePanel
              ? 'h-full shrink-0 max-w-full'
              : 'fixed bottom-0 right-0 top-0 w-full sm:w-[420px] border-l border-slate-800'
          }`}
          style={isSidePanel ? { width: width ? `${width}px` : '400px' } : undefined}
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TutorAvatar avatar={personality.avatar} name={personality.name} size={36} />
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {personality.name} Tutor
                  <span className="px-2 py-0.2 text-[9px] uppercase font-bold rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                    FreeModel
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Guiding step-by-step problem solving</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Close DSA tutor"
              onClick={onToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-3 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#17171b] hover:bg-[#202024] text-amber-200 border border-white/10 transition flex items-center gap-1 shrink-0"
              >
                <Zap className="w-3 h-3 text-amber-300" />
                <span>{prompt}</span>
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 h-fit shrink-0">
                    <TutorAvatar avatar={personality.avatar} name={personality.name} size={28} />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl max-w-[82%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-400 text-[#08080a] font-medium rounded-tr-none shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line shadow'
                  }`}
                >
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 h-fit shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center text-slate-400 text-xs">
                <div className="h-7 w-7">
                  <TutorAvatar avatar={personality.avatar} name={personality.name} size={28} />
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Thinking & analyzing code logic...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                aria-label="Ask the DSA tutor a question"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the DSA tutor a question..."
                className="flex-1 bg-[#08080a] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400 font-sans"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Send question to DSA tutor"
                className="p-2.5 bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold rounded-lg shadow transition disabled:opacity-50"
              >
                <Send className="w-4 h-4 fill-slate-950" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TutorDrawer;
