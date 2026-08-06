'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCw,
  User,
} from 'lucide-react';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import type { RevisionCardDTO, RevisionDeckResponse, RevisionDeckStats } from '@/lib/types';
import type { RevisionQuality } from '@/lib/revisionSchedule';

const EMPTY_STATS: RevisionDeckStats = {
  totalCards: 0,
  dueTodayCount: 0,
  masteredCount: 0,
  learnedMistakeCount: 0,
  nextDueDate: null,
};

const QUALITY_COPY: Record<RevisionQuality, { label: string; helper: string; className: string }> = {
  HARD: {
    label: 'Hard',
    helper: 'Review tomorrow',
    className: 'bg-rose-500 text-white active:bg-rose-400',
  },
  GOOD: {
    label: 'Good',
    helper: 'Space it out',
    className: 'bg-amber-400 text-black active:bg-amber-300',
  },
  EASY: {
    label: 'Easy',
    helper: 'Push further',
    className: 'bg-emerald-400 text-black active:bg-emerald-300',
  },
};

function compactDate(value: string | null) {
  if (!value) return 'No upcoming cards';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function parseTopicTags(topicTags: string) {
  try {
    const parsed = JSON.parse(topicTags);
    return Array.isArray(parsed) ? parsed.slice(0, 3).filter((tag) => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

export default function MobileRevisionPage() {
  const [cards, setCards] = useState<RevisionCardDTO[]>([]);
  const [dueCards, setDueCards] = useState<RevisionCardDTO[]>([]);
  const [stats, setStats] = useState<RevisionDeckStats>(EMPTY_STATS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingQuality, setSubmittingQuality] = useState<RevisionQuality | null>(null);

  const activeCard = dueCards[currentIndex] || null;

  const loadDeck = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const response = await fetch('/api/revision', {
        credentials: 'include',
        signal,
      });

      if (response.status === 401) {
        setError('Sign in to load your revision deck on this phone.');
        return;
      }

      if (!response.ok) throw new Error('Revision deck failed to load');

      const data = (await response.json()) as RevisionDeckResponse;
      setCards(data.cards || []);
      setDueCards(data.dueCards || []);
      setStats(data.stats || EMPTY_STATS);
      setCurrentIndex(0);
      setShowAnswer(false);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('Could not reach your revision deck. Check your connection and try again.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDeck(controller.signal);
    return () => controller.abort();
  }, [loadDeck]);

  useEffect(() => {
    setShowAnswer(false);
  }, [activeCard?.id]);

  const topicTags = activeCard?.problem?.topicTags ? parseTopicTags(activeCard.problem.topicTags) : [];

  const rateCard = async (quality: RevisionQuality) => {
    if (!activeCard || submittingQuality) return;

    setSubmittingQuality(quality);
    try {
      const response = await fetch('/api/revision', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: activeCard.id, quality }),
      });

      if (response.status === 401) {
        setError('Your session expired. Sign in again to keep reviewing.');
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Could not save review');
      }

      const remainingDueCards = dueCards.filter((card) => card.id !== activeCard.id);
      setDueCards(remainingDueCards);
      setStats((previous) => ({
        ...previous,
        dueTodayCount: Math.max(0, previous.dueTodayCount - 1),
      }));
      setCurrentIndex((previous) => Math.min(previous, Math.max(remainingDueCards.length - 1, 0)));
      setShowAnswer(false);
      loadDeck();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review');
    } finally {
      setSubmittingQuality(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090d] px-5 py-8 text-slate-100">
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-amber-300" />
          <p className="text-sm font-semibold text-slate-300">Loading your revision deck...</p>
        </div>
      </main>
    );
  }

  const completedToday = Math.max(0, stats.dueTodayCount - dueCards.length);
  const totalToday = completedToday + dueCards.length;
  const progress = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 100;

  return (
    <main className="min-h-screen bg-[#08090d] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3 py-2">
          <Link
            href="/mobile/profile"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 active:bg-white/10"
            aria-label="Open profile"
          >
            <User className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">CodeForge</p>
            <h1 className="truncate text-lg font-black text-white">Revision Deck</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadDeck();
            }}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 active:bg-white/10"
            aria-label="Refresh deck"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </header>

        <section className="grid grid-cols-3 gap-2 py-4">
          <div className="rounded-lg border border-white/10 bg-[#11131a] p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Due</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{dueCards.length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#11131a] p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Mastered</p>
            <p className="mt-1 text-2xl font-black text-emerald-300">{stats.masteredCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#11131a] p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Next</p>
            <p className="mt-2 truncate text-sm font-black text-slate-200">{compactDate(stats.nextDueDate)}</p>
          </div>
        </section>

        {error && (
          <section className="mb-4 rounded-lg border border-rose-400/30 bg-rose-950/30 p-4">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-rose-300" />
              <div>
                <p className="text-sm font-bold text-rose-100">{error}</p>
                <Link href="/mobile/login" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-rose-200">
                  Sign in <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {activeCard ? (
          <section className="flex flex-1 flex-col">
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                <span>{completedToday + 1} of {totalToday}</span>
                <span>{progress}% done</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAnswer((value) => !value)}
              className="flex min-h-[52vh] flex-1 flex-col rounded-lg border border-white/10 bg-[#11131a] p-5 text-left shadow-2xl shadow-black/30 active:border-amber-300/60"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">{activeCard.pattern}</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-white">{activeCard.problem.title}</h2>
                </div>
                <DifficultyBadge difficulty={activeCard.problem.difficulty} />
              </div>

              {topicTags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {topicTags.map((tag) => (
                    <span key={tag} className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-bold text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {!showAnswer ? (
                <div className="flex flex-1 flex-col justify-between gap-5">
                  <p className="line-clamp-[12] text-sm leading-6 text-slate-300">{activeCard.problem.statement}</p>
                  <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
                    <p className="text-sm font-bold text-amber-100">Tap to reveal the takeaway before rating yourself.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
                      <BookOpenCheck className="h-4 w-4" /> Key Takeaway
                    </p>
                    <p className="text-base leading-7 text-slate-100">{activeCard.keyTakeaway}</p>
                  </div>
                  {(activeCard.lastFailedInput || activeCard.lastExpectedOutput || activeCard.lastActualOutput || activeCard.lastError) && (
                    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Last weak spot</p>
                      {activeCard.lastFailedInput && <pre className="mb-2 whitespace-pre-wrap text-xs text-slate-300">Input: {activeCard.lastFailedInput}</pre>}
                      {activeCard.lastExpectedOutput && <pre className="mb-2 whitespace-pre-wrap text-xs text-emerald-200">Expected: {activeCard.lastExpectedOutput}</pre>}
                      {activeCard.lastActualOutput && <pre className="mb-2 whitespace-pre-wrap text-xs text-rose-200">Actual: {activeCard.lastActualOutput}</pre>}
                      {activeCard.lastError && <pre className="whitespace-pre-wrap text-xs text-amber-200">Error: {activeCard.lastError}</pre>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-white/[0.05] p-3">
                      <p className="text-xs font-bold text-slate-500">Interval</p>
                      <p className="mt-1 font-black text-slate-100">{activeCard.interval} day{activeCard.interval === 1 ? '' : 's'}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.05] p-3">
                      <p className="text-xs font-bold text-slate-500">Reviews</p>
                      <p className="mt-1 font-black text-slate-100">{activeCard.repetitions}</p>
                    </div>
                  </div>
                </div>
              )}
            </button>

            <div className="grid grid-cols-3 gap-2 pb-[env(safe-area-inset-bottom)] pt-4">
              {(Object.keys(QUALITY_COPY) as RevisionQuality[]).map((quality) => {
                const copy = QUALITY_COPY[quality];
                return (
                  <button
                    key={quality}
                    type="button"
                    disabled={!showAnswer || Boolean(submittingQuality)}
                    onClick={() => rateCard(quality)}
                    className={`min-h-16 rounded-lg px-2 py-3 text-center disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 ${copy.className}`}
                  >
                    <span className="block text-sm font-black">{submittingQuality === quality ? 'Saving' : copy.label}</span>
                    <span className="mt-1 block text-[10px] font-bold opacity-75">{copy.helper}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-white">
              {cards.length > 0 ? 'All caught up' : 'No revision cards yet'}
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
              {cards.length > 0
                ? 'Your due cards are done. Come back when the next scheduled card unlocks.'
                : 'Solve problems and submit attempts on CodeForge to build your personal deck.'}
            </p>
            <div className="mt-6 flex w-full flex-col gap-3">
              <Link
                href="/mobile/profile"
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 text-sm font-black text-black active:bg-amber-200"
              >
                Open Profile <ChevronRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  loadDeck();
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 active:bg-white/10"
              >
                <RotateCw className="h-4 w-4" /> Refresh
              </button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <CalendarClock className="h-4 w-4" /> Total cards: {stats.totalCards}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
