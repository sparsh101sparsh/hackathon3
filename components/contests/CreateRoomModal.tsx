'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Loader2, Swords, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useDialogAccessibility } from '@/lib/useDialogAccessibility';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<'MIXED' | 'EASY' | 'MEDIUM' | 'HARD'>('MIXED');
  const [problemCount, setProblemCount] = useState<number>(3);
  const [mode, setMode] = useState<'DUEL' | 'SQUAD'>('DUEL');
  const [durationSeconds, setDurationSeconds] = useState<number>(900);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in to create a battle room.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: sends session cookie
        body: JSON.stringify({
          name: name || undefined,
          difficulty,
          problemCount: mode === 'DUEL' ? 1 : problemCount,
          mode,
          durationSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      onClose();
      router.push(`/contests/room/${data.roomCode}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating room');
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
          aria-labelledby="create-battle-room-title"
          ref={dialogRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <h3 id="create-battle-room-title" className="text-lg font-black text-white">Create Battle Room</h3>
                <p className="text-xs text-slate-400">Compete with friends (Max 10 players)</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close create battle dialog"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Auth gate */}
          {!user ? (
            <div className="py-8 text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Sign In Required</p>
                <p className="text-xs text-slate-400 mt-1">You must be signed in to create a battle room</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition">
                  Cancel
                </button>
                <Link href="/login" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold text-center transition">
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Host Info Badge */}
              <div className="mb-4 px-3 py-2 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Hosting as <span className="text-white font-bold">{user.name}</span></span>
              </div>

              {error && (
                <div role="alert" aria-live="assertive" className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Room Name */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">Room Name <span className="text-slate-500">(optional)</span></label>
                  <input
                    type="text"
                    aria-label="Room name"
                    placeholder={`${user.name}'s Battle Arena`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                {/* Battle Format */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Battle Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DUEL', 'SQUAD'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMode(value)}
                        className={`py-2.5 rounded-xl text-[11px] font-bold border transition ${mode === value ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                      >
                        <span className="inline-flex items-center gap-1.5">{value === 'DUEL' ? <Swords className="w-3.5 h-3.5" aria-hidden="true" /> : <Users className="w-3.5 h-3.5" aria-hidden="true" />} {value === 'DUEL' ? '1v1 Duel' : 'Squad Race'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">Difficulty Pool</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['MIXED', 'EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition ${
                          difficulty === d
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Problem Count (Squad only) */}
                <div className={mode === 'DUEL' ? 'opacity-40 pointer-events-none' : ''}>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                    Problems: <span className="text-amber-400 font-mono">{mode === 'DUEL' ? 1 : problemCount}</span>
                    {mode === 'DUEL' && <span className="text-slate-500 font-normal ml-2">(1 per duel)</span>}
                  </label>
                  {mode === 'SQUAD' && (
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setProblemCount(cnt)}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            problemCount === cnt
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cnt}Q
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                    Time Limit: <span className="text-amber-400 font-mono">{Math.floor(durationSeconds / 60)} min</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[300, 600, 900, 1800].map((secs) => (
                      <button
                        key={secs}
                        type="button"
                        onClick={() => setDurationSeconds(secs)}
                        className={`py-2 rounded-xl text-[11px] font-bold border transition ${
                          durationSeconds === secs
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {secs / 60}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Player Limit Note */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-4 h-4 text-amber-400" /> Max Players
                  </span>
                  <span className="font-bold text-amber-400 font-mono">10 Friends</span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xl shadow-amber-950/30 hover:scale-[1.01] transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating Battle Arena...
                    </>
                  ) : (
                    <>
                      <Swords className="w-4 h-4" /> Create Battle Room
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
