'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type Mode = 'password' | 'otp';
type Step = 'email' | 'code';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function MobileLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json().catch(() => null);
        if (active && data?.user) router.replace('/mobile/revision');
      } finally {
        if (active) setLoading(false);
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  const submitPasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isEmail(email) || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Could not sign in.');
      router.replace('/mobile/revision');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendLoginCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    setMessage(null);

    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'LOGIN' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Could not send code.');
      setStep('code');
      setMessage(data?.devCode ? `Dev code: ${data.devCode}` : `Code sent to ${email.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyLoginCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6 digit code.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim(), purpose: 'LOGIN' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Invalid code.');
      router.replace('/mobile/revision');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#08090d] px-5 py-8 text-slate-100">
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-amber-300" />
          <p className="text-sm font-semibold text-slate-300">Checking your app session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="pb-8 pt-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">CodeForge App</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-white">Sign in to revise</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            This app only opens your profile and revision deck. No desktop website navigation.
          </p>
        </header>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setStep('email');
              setError(null);
              setMessage(null);
            }}
            className={`min-h-11 rounded-md text-sm font-black ${mode === 'password' ? 'bg-amber-300 text-black' : 'text-slate-300'}`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setStep('email');
              setError(null);
              setMessage(null);
            }}
            className={`min-h-11 rounded-md text-sm font-black ${mode === 'otp' ? 'bg-amber-300 text-black' : 'text-slate-300'}`}
          >
            Email Code
          </button>
        </div>

        {error && (
          <div className="mb-4 flex gap-3 rounded-lg border border-rose-400/30 bg-rose-950/30 p-4 text-rose-100">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-rose-300" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-950/20 p-4 text-sm font-bold text-emerald-100">
            {message}
          </div>
        )}

        {mode === 'password' ? (
          <form onSubmit={submitPasswordLogin} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Email</span>
              <span className="flex min-h-14 items-center gap-3 rounded-lg border border-white/10 bg-[#11131a] px-4 focus-within:border-amber-300/60">
                <Mail className="h-5 w-5 text-slate-500" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-600"
                  placeholder="you@example.com"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Password</span>
              <span className="flex min-h-14 items-center gap-3 rounded-lg border border-white/10 bg-[#11131a] px-4 focus-within:border-amber-300/60">
                <Lock className="h-5 w-5 text-slate-500" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-600"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="grid h-10 w-10 place-items-center rounded-full text-slate-400 active:bg-white/10"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 text-base font-black text-black disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Open Revision App <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>
        ) : step === 'email' ? (
          <form onSubmit={sendLoginCode} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Email</span>
              <span className="flex min-h-14 items-center gap-3 rounded-lg border border-white/10 bg-[#11131a] px-4 focus-within:border-amber-300/60">
                <Mail className="h-5 w-5 text-slate-500" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-slate-600"
                  placeholder="you@example.com"
                />
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 text-base font-black text-black disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send Code <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyLoginCode} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Verification Code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="min-h-16 w-full rounded-lg border border-white/10 bg-[#11131a] px-4 text-center text-2xl font-black tracking-[0.35em] text-white outline-none focus:border-amber-300/60"
                placeholder="000000"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 text-base font-black text-black disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify & Open <ArrowRight className="h-5 w-5" /></>}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => sendLoginCode()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" /> Send New Code
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
