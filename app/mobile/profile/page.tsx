'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpenCheck,
  ChevronRight,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { RevisionDeckResponse, RevisionDeckStats } from '@/lib/types';

interface MobileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

const EMPTY_STATS: RevisionDeckStats = {
  totalCards: 0,
  dueTodayCount: 0,
  masteredCount: 0,
  learnedMistakeCount: 0,
  nextDueDate: null,
};

function formatDate(value?: string) {
  if (!value) return 'CodeForge learner';
  return `Joined ${new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(value))}`;
}

export default function MobileProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<MobileUser | null>(null);
  const [stats, setStats] = useState<RevisionDeckStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    setRefreshing(true);
    try {
      const meResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      const meData = await meResponse.json().catch(() => null);
      if (!meData?.user) {
        router.replace('/mobile/login');
        return;
      }

      setUser(meData.user);
      const deckResponse = await fetch('/api/revision', {
        credentials: 'include',
        cache: 'no-store',
      });
      const deckData = (await deckResponse.json().catch(() => null)) as RevisionDeckResponse | null;
      setStats(deckData?.stats || EMPTY_STATS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    router.replace('/mobile/login');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090d] px-5 py-8 text-slate-100">
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-amber-300" />
          <p className="text-sm font-semibold text-slate-300">Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3 py-2">
          <Link
            href="/mobile/revision"
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 active:bg-white/10"
            aria-label="Open revision deck"
          >
            <BookOpenCheck className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300">CodeForge App</p>
            <h1 className="truncate text-lg font-black text-white">Profile</h1>
          </div>
          <button
            type="button"
            onClick={loadProfile}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 active:bg-white/10"
            aria-label="Refresh profile"
          >
            {refreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          </button>
        </header>

        <section className="mt-5 rounded-lg border border-white/10 bg-[#11131a] p-5">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
            <User className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-white">{user?.name || 'Coder'}</h2>
          <p className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-400">
            <Mail className="h-4 w-4" /> {user?.email}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            <ShieldCheck className="h-4 w-4" /> {formatDate(user?.createdAt)}
          </p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-[#11131a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Total Deck</p>
            <p className="mt-2 text-3xl font-black text-white">{stats.totalCards}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#11131a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Due Today</p>
            <p className="mt-2 text-3xl font-black text-amber-300">{stats.dueTodayCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#11131a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Mastered</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">{stats.masteredCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#11131a] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Mistakes</p>
            <p className="mt-2 text-3xl font-black text-rose-300">{stats.learnedMistakeCount}</p>
          </div>
        </section>

        <div className="mt-auto space-y-3 pt-6">
          <Link
            href="/mobile/revision"
            className="flex min-h-14 items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 text-base font-black text-black active:bg-amber-200"
          >
            Open Revision Deck <ChevronRight className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 active:bg-white/10"
          >
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
