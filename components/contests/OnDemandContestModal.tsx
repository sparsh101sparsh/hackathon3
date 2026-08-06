'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Trophy, X, Loader2, Play, Flame, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useDialogAccessibility } from '@/lib/useDialogAccessibility';

interface OnDemandContestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnDemandContestModal: React.FC<OnDemandContestModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [format, setFormat] = useState<'AI_BOT_DUEL' | 'INSTANT_BLITZ' | 'MASTER_CHALLENGE'>('AI_BOT_DUEL');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'>('MIXED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  const handleLaunch = async () => {
    setError(null);
    if (!user) {
      setError('You must be signed in to launch an On-Demand Contest.');
      return;
    }

    setLoading(true);
    try {
      const problemCount = format === 'INSTANT_BLITZ' ? 3 : format === 'MASTER_CHALLENGE' ? 4 : 1;
      const durationSeconds = format === 'INSTANT_BLITZ' ? 900 : format === 'MASTER_CHALLENGE' ? 1800 : 600;

      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: format === 'AI_BOT_DUEL' ? `1v1 vs Grandmaster` : `On-Demand Blitz`,
          difficulty,
          problemCount,
          mode: format === 'AI_BOT_DUEL' ? 'DUEL' : 'SQUAD',
          addAiBot: format === 'AI_BOT_DUEL',
          isAiDuel: format === 'AI_BOT_DUEL',
          durationSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to launch contest');

      // Bot duels start the battle immediately.
      if (format === 'AI_BOT_DUEL') {
        await fetch(`/api/rooms/${data.roomCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'START_BATTLE' }),
        });
      }

      onClose();
      router.push(`/contests/room/${data.roomCode}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error launching on-demand contest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="on-demand-contest-title"
          ref={dialogRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Top banner accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 id="on-demand-contest-title" className="text-lg font-black text-white">Instant Contest</h3>
                <p className="text-xs text-slate-400">Launch an on-demand duel or blitz with automatic scoring</p>
              </div>
            </div>
            <button type="button" aria-label="Close on-demand contest dialog" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!user ? (
            <div className="py-8 text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Sign In Required</p>
                <p className="text-xs text-slate-400 mt-1">You must be signed in to launch on-demand contests</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
                  Cancel
                </button>
                <Link href="/login" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold text-center">
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Contest Format Cards */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-2 block">Choose Battle Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormat('AI_BOT_DUEL')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      format === 'AI_BOT_DUEL'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-5 h-5 mb-2 text-amber-400" />
                    <div>
                      <div className="text-xs font-black text-white">1v1 Bot Duel</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Vs Grandmaster</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('INSTANT_BLITZ')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      format === 'INSTANT_BLITZ'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-5 h-5 mb-2 text-amber-400" />
                    <div>
                      <div className="text-xs font-black text-white">15m Blitz</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">3 Dynamic Problems</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('MASTER_CHALLENGE')}
                    className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      format === 'MASTER_CHALLENGE'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-5 h-5 mb-2 text-amber-400" />
                    <div>
                      <div className="text-xs font-black text-white">30m Master</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Full automatic evaluation</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">Target Difficulty</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['MIXED', 'EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        difficulty === d
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div role="alert" aria-live="assertive" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">{error}</div>}

              {/* Launch Button */}
              <button
                onClick={handleLaunch}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xl shadow-amber-950/30 hover:scale-[1.01] transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Provisioning contest...
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" /> Start On-Demand Contest
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
