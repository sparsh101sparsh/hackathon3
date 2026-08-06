'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, Loader2, ArrowRight, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useDialogAccessibility } from '@/lib/useDialogAccessibility';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in to join a battle room.');
      return;
    }

    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a Room Code');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: sends session cookie
        body: JSON.stringify({
          roomCode: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      onClose();
      router.push(`/contests/room/${data.roomCode}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error joining room');
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
          aria-labelledby="join-battle-room-title"
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
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 id="join-battle-room-title" className="text-lg font-black text-white">Join Friend Battle</h3>
                <p className="text-xs text-slate-400">Enter the room code to join (Max 10 players)</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close join battle dialog"
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
                <p className="text-xs text-slate-400 mt-1">You must be signed in to join a battle room</p>
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
              {/* User badge */}
              <div className="mb-4 px-3 py-2 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Joining as <span className="text-white font-bold">{user.name}</span></span>
              </div>

              {error && (
                <div role="alert" aria-live="assertive" className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Room Code */}
                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">Room Code</label>
                  <input
                    type="text"
                    aria-label="Room code"
                    required
                    autoFocus
                    placeholder="e.g. BATTLE-7X9K"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest text-amber-400 uppercase placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    maxLength={12}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Format: BATTLE-XXXX (shared by your friend)</p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !roomCode.trim()}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xl shadow-amber-950/30 hover:scale-[1.01] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Joining Battle Room...
                    </>
                  ) : (
                    <>
                      <span>Join Battle Room</span>
                      <ArrowRight className="w-4 h-4" />
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
