'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Code2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { sendCode, verifyCode } = useAuth();

  // Wizard Step: 1 = Details, 2 = Verify Code
  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Send verification code to email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    const result = await sendCode(email, 'SIGNUP', name, password);
    setLoading(false);

    if (result.success) {
      setVerificationCode('');
      setStep(2);
      setCooldown(60);
      const msg = result.devCode
        ? `Dev mode: your OTP is ${result.devCode} (no real email sent)`
        : `A 6-digit verification code has been sent to ${email}. Check your inbox!`;
      setSuccessMessage(msg);
    } else {
      setError(result.error || 'Failed to send verification code');
    }
  };

  // Step 2: Verify code and complete account registration
  const handleVerifyAndRegister = async (e?: React.FormEvent, codeToVerify?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetCode = codeToVerify || verificationCode;
    if (!targetCode || !/^\d{6}$/.test(targetCode.trim())) {
      setError('Please enter the full 6-digit verification code');
      return;
    }

    setLoading(true);
    const result = await verifyCode(email, targetCode.trim(), 'SIGNUP', name, password);
    setLoading(false);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Verification failed');
    }
  };

  // Resend Code handler
  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setError(null);
    setSuccessMessage(null);
    setVerificationCode('');
    setResending(true);
    const result = await sendCode(email, 'SIGNUP', name, password);
    setResending(false);

    if (result.success) {
      setCooldown(60);
      const msg = result.devCode
        ? `Dev mode: your new OTP is ${result.devCode} (no real email sent)`
        : `A new 6-digit code has been sent to ${email}`;
      setSuccessMessage(msg);
    } else {
      setError(result.error || 'Failed to resend verification code');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Radiant Glow background */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top subtle line accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400/70" />

          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-[#08080a] border border-amber-400/30 text-amber-300 shadow-inner mb-2">
              <Code2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {step === 1 ? 'Create Your Account' : 'Verify Your Email'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {step === 1
                ? 'Join CodeForge to track your DSA mastery & interview preparation'
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {/* Notifications */}
          {error && (
            <motion.div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-medium"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 ? (
              /* STEP 1: ENTER ACCOUNT DETAILS */
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendCode}
                className="space-y-4"
              >
                {/* Google OAuth Button */}
                <a
                  href="/api/auth/google"
                  className="w-full mb-4 flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white text-xs sm:text-sm font-semibold shadow-lg hover:border-slate-700 transition group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 22.3 12 22.3z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </a>

                <div className="relative mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    or register with email
                  </span>
                </div>

                {/* Full Name Field */}
                <div className="space-y-1.5">
                  <label htmlFor="register-name" className="text-xs font-semibold text-slate-300">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="register-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="shashwat"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium transition"
                    />
                  </div>
                </div>

                {/* Email Address Field */}
                <div className="space-y-1.5">
                  <label htmlFor="register-email" className="text-xs font-semibold text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="register-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="shaswat@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium transition"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="register-password" className="text-xs font-semibold text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium transition"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password Strength Meter */}
                  <PasswordStrengthMeter password={password} />
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="register-confirm-password" className="text-xs font-semibold text-slate-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="register-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium transition"
                    />
                  </div>
                </div>

                {/* Next Step Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-sm shadow-xl shadow-amber-400/10 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              /* STEP 2: ENTER 6-DIGIT OTP CODE */
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={(e) => handleVerifyAndRegister(e)}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>6-Digit Verification Code</span>
                    <span className="text-[11px] text-emerald-400">Expires in 10m</span>
                  </label>

                  {/* Interactive Auto-Advancing 6-Digit OTP Component */}
                  <OtpInput
                    value={verificationCode}
                    onChange={setVerificationCode}
                    onComplete={(code) => handleVerifyAndRegister(undefined, code)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setVerificationCode('');
                      setError(null);
                      setSuccessMessage(null);
                      setCooldown(0);
                    }}
                    className="text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Edit Details
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending || cooldown > 0}
                    className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}</span>
                  </button>
                </div>

                {/* Submit Account Creation Button */}
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full relative group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-sm shadow-xl shadow-amber-400/10 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Verifying & Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Create Account</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
