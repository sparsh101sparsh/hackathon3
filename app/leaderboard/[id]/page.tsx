'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart3, CheckCircle2, Flame, Search, Trophy, Users } from 'lucide-react';

interface Profile {
  id: string; name: string; avatar: string; joinedAt: string; rating: number;
  ratingTier: { badge: string; colorClass: string }; solved: { easy: number; medium: number; hard: number; total: number };
  accuracy: number; streak: number; consistency: number;
  recentSubmissions: Array<{ status: string; createdAt: string; problem: { title: string; slug: string; difficulty: string } }>;
}

interface ProfileComparison {
  summary: string;
  advantages: string[];
  focusAreas: string[];
  recommendation: string;
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return <div className="border border-white/10 rounded-lg bg-[#111115] p-4"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>;
}

export default function PublicProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [compare, setCompare] = useState<Profile | null>(null);
  const [comparison, setComparison] = useState<ProfileComparison | null>(null);
  const [compareId, setCompareId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const load = useCallback(async (requestedCompare = '') => {
    setLoading(true); setError('');
    const query = requestedCompare ? `?compare=${encodeURIComponent(requestedCompare.trim())}` : '';
    try {
      const response = await fetch(`/api/leaderboard/${encodeURIComponent(id)}${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Profile unavailable');
      setProfile(data.profile); setCompare(data.compare || null); setComparison(data.comparison || null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Profile unavailable'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);

  if (loading) return <main className="min-h-screen bg-[#08080a] text-slate-400 grid place-items-center">Loading profile...</main>;
  if (error || !profile) return <main className="min-h-screen bg-[#08080a] text-slate-200 grid place-items-center"><div className="text-center"><p className="text-rose-400">{error || 'Profile not found'}</p><Link href="/leaderboard" className="mt-4 inline-flex items-center gap-2 text-amber-400"><ArrowLeft className="w-4 h-4" />Back to leaderboard</Link></div></main>;

  return <main className="min-h-screen bg-[#08080a] text-slate-100 px-4 py-8 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/leaderboard" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400"><ArrowLeft className="h-4 w-4" />Leaderboard</Link>
      <section className="flex flex-col gap-5 rounded-xl border border-white/10 bg-[#111115] p-6 sm:flex-row sm:items-center">
        <Image src={profile.avatar} alt={profile.name} width={80} height={80} unoptimized className="h-20 w-20 rounded-full border border-amber-400/40 bg-[#08080a]" />
        <div className="flex-1"><h1 className="text-2xl font-black text-white">{profile.name}</h1><p className="mt-1 text-xs text-slate-400">Member since {profile.joinedAt} · public coding profile</p><p className={`mt-2 text-sm font-bold ${profile.ratingTier.colorClass}`}>{profile.ratingTier.badge} · {profile.rating} rating</p></div>
        <form onSubmit={(event) => { event.preventDefault(); void load(compareId); }} className="flex gap-2"><input value={compareId} onChange={(event) => setCompareId(event.target.value)} placeholder="Compare profile ID" aria-label="Compare profile ID" className="w-44 rounded-lg border border-white/10 bg-[#08080a] px-3 py-2 text-xs text-white outline-none focus:border-amber-400" /><button className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300"><Search className="mr-1 inline h-3.5 w-3.5" />Compare</button></form>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Solved" value={profile.solved.total} icon={<CheckCircle2 className="h-4 w-4 text-amber-300" />} /><Stat label="Accuracy" value={`${profile.accuracy}%`} icon={<BarChart3 className="h-4 w-4 text-amber-400" />} /><Stat label="Streak" value={`${profile.streak} days`} icon={<Flame className="h-4 w-4 text-amber-400" />} /><Stat label="Consistency" value={`${profile.consistency}%`} icon={<Users className="h-4 w-4 text-slate-300" />} /></div>
      {compare && <section className="space-y-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"><div className="mb-4 flex items-center gap-2 text-sm font-bold text-amber-300"><Trophy className="h-4 w-4" />Profile comparison</div><div className="grid grid-cols-3 gap-3 text-center text-xs"><div className="text-slate-400">Metric</div><div className="font-bold text-white">{profile.name}</div><div className="font-bold text-white">{compare.name}</div>{[['Rating', profile.rating, compare.rating], ['Solved', profile.solved.total, compare.solved.total], ['Easy / Medium / Hard', `${profile.solved.easy} / ${profile.solved.medium} / ${profile.solved.hard}`, `${compare.solved.easy} / ${compare.solved.medium} / ${compare.solved.hard}`], ['Accuracy', `${profile.accuracy}%`, `${compare.accuracy}%`], ['Streak', profile.streak, compare.streak], ['Consistency', `${profile.consistency}%`, `${compare.consistency}%`]].map(([label, left, right]) => <React.Fragment key={String(label)}><div className="border-t border-slate-800 pt-3 text-left text-slate-400">{label}</div><div className="border-t border-slate-800 pt-3 font-bold text-amber-300">{left}</div><div className="border-t border-slate-800 pt-3 font-bold text-amber-300">{right}</div></React.Fragment>)}</div>{comparison && <div className="grid gap-4 border-t border-amber-500/20 pt-4 md:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">AI readout</p><p className="mt-2 text-xs leading-5 text-slate-300">{comparison.summary}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Strengths</p><ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">{comparison.advantages.map((item) => <li key={item}>• {item}</li>)}</ul></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Next focus</p><ul className="mt-2 space-y-1 text-xs leading-5 text-slate-300">{comparison.focusAreas.map((item) => <li key={item}>• {item}</li>)}</ul><p className="mt-2 text-xs leading-5 text-slate-400">{comparison.recommendation}</p></div></div>}</section>}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="mb-4 text-sm font-bold text-white">Recent submissions</h2><div className="space-y-2">{profile.recentSubmissions.map((item, index) => <Link key={`${item.problem.slug}-${index}`} href={`/problems/${item.problem.slug}`} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-xs hover:border-amber-500/40"><span className="text-slate-200">{item.problem.title}</span><span className={item.status === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'}>{item.status}</span></Link>)}</div></section>
    </div>
  </main>;
}
