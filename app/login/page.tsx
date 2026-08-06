'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { OtpInput } from '@/components/ui/OtpInput';
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Code2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';

function LoginPageInner() {
  const router = useRouter();
  const { user, login, sendCode, verifyCode, resetPassword } = useAuth();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const safeNextPath = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard';

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      router.push(safeNextPath);
    }
  }, [safeNextPath, user, router]);

  // Auth Mode: 'password' | 'code' | 'forgot'
  const [authMode, setAuthMode] = useState<'password' | 'code' | 'forgot'>('password');
  // Code Step for OTP Sign In or Password Reset (1 = Enter Email, 2 = Enter Code & Reset)
  const [codeStep, setCodeStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Show errors from Google OAuth redirect
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      const errorMessages: Record<string, string> = {
        google_not_configured: 'Google login is not configured.',
        google_invalid_state: 'Google sign-in session expired. Please try again.',
        google_state_missing: 'Google sign-in session expired. Please try again.',
        google_state_invalid: 'Google sign-in security validation failed. Please try again.',
        google_token_exchange_failed: 'Google authentication failed. Please try again.',
        google_missing_access_token: 'Could not retrieve Google access token. Try again.',
        google_profile_failed: 'Could not fetch Google profile. Try again.',
        google_email_not_verified: 'Your Google account email is not verified.',
        google_login_failed: 'Google sign-in failed. Please try again or use email/password.',
        google_no_code: 'Google did not return an authorization code.',
        google_missing_profile: 'Could not retrieve Google profile info.',
        google_state_error: 'Security validation failed. Please try again.',
      };
      setError(errorMessages[urlError] || `Sign-in error: ${urlError}`);
    }
  }, [searchParams]);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Helper: fully reset code-related state when switching modes or steps
  const resetCodeState = () => {
    setVerificationCode('');
    setError(null);
    setSuccessMessage(null);
    setCooldown(0);
  };

  // Standard Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      router.push(safeNextPath);
    } else {
      setError(result.error || 'Failed to sign in');
    }
  };

  // Step 1: Send Login Code or Reset Password Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const purpose = authMode === 'forgot' ? 'RESET_PASSWORD' : 'LOGIN';

    setLoading(true);
    const result = await sendCode(email, purpose);
    setLoading(false);

    if (result.success) {
      setCodeStep(2);
      setCooldown(60);
      const msg = result.devCode
        ? (purpose === 'RESET_PASSWORD'
            ? `Dev mode: your reset OTP is ${result.devCode} (no real email sent)`
            : `Dev mode: your sign-in OTP is ${result.devCode} (no real email sent)`)
        : (purpose === 'RESET_PASSWORD'
            ? `A 6-digit password reset code has been sent to ${email}`
            : `A 6-digit sign-in code has been sent to ${email}`);
      setSuccessMessage(msg);
    } else {
      setError(result.error || 'Failed to send verification code');
    }
  };

  // Step 2: Verify Login Code
  const handleVerifyLoginCode = async (e?: React.FormEvent, codeToVerify?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetCode = codeToVerify || verificationCode;
    if (!targetCode || !/^\d{6}$/.test(targetCode.trim())) {
      setError('Please enter the full 6-digit verification code');
      return;
    }

    setLoading(true);
    const result = await verifyCode(email, targetCode.trim(), 'LOGIN');
    setLoading(false);

    if (result.success) {
      router.push(safeNextPath);
    } else {
      setError(result.error || 'Invalid or expired verification code');
    }
  };

  // Step 2: Reset Password and Authenticate
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!verificationCode || !/^\d{6}$/.test(verificationCode.trim())) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email, verificationCode.trim(), newPassword);
    setLoading(false);

    if (result.success) {
      router.push(safeNextPath);
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  // Resend Code handler
  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setError(null);
    setSuccessMessage(null);
    setVerificationCode('');
    setResending(true);
    const purpose = authMode === 'forgot' ? 'RESET_PASSWORD' : 'LOGIN';
    const result = await sendCode(email, purpose);
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
              {authMode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {authMode === 'forgot'
                ? 'Reset your password via 6-digit email OTP verification'
                : 'Sign in with your email to continue practicing DSA & guided coaching'}
            </p>
          </div>

          {/* Google OAuth Button */}
          <a
            href="/api/auth/google"
            className="w-full mb-5 flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white text-xs sm:text-sm font-semibold shadow-lg hover:border-slate-700 transition group"
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

          <div className="relative mb-5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              or email authentication
            </span>
          </div>

          {/* Auth Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setCodeStep(1);
                resetCodeState();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                authMode === 'password'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('code');
                setCodeStep(1);
                resetCodeState();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                authMode === 'code'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('forgot');
                setCodeStep(1);
                resetCodeState();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                authMode === 'forgot'
                  ? 'bg-[#17171b] text-amber-300 border border-amber-400/40 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Forgot Pass
            </button>
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
              role="status"
              aria-live="polite"
              aria-atomic="true"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-xs font-medium"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {authMode === 'password' ? (
              /* MODE 1: STANDARD PASSWORD SIGN IN */
              <motion.form
                key="password-mode"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handlePasswordLogin}
                className="space-y-4"
              >
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="login-password-email" className="text-xs font-semibold text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password-email"
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="shaswat@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#08080a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium transition"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setCodeStep(1);
                      }}
                      className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#08080a] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium transition"
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
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-sm shadow-xl shadow-amber-400/10 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : authMode === 'code' ? (
              /* MODE 2: EMAIL OTP SIGN IN */
              <motion.form
                key="code-mode"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={codeStep === 1 ? handleSendCode : (e) => handleVerifyLoginCode(e)}
                className="space-y-5"
              >
                {codeStep === 1 ? (
                  <div className="space-y-1.5">
                    <label htmlFor="login-code-email" className="text-xs font-semibold text-slate-300">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-code-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="shaswat@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#08080a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>6-Digit Sign-In Code</span>
                      <span className="text-[11px] text-amber-300">Sent to {email}</span>
                    </label>

                    {/* Interactive 6-Digit OTP Component */}
                    <OtpInput
                      value={verificationCode}
                      onChange={setVerificationCode}
                      onComplete={(code) => handleVerifyLoginCode(undefined, code)}
                      disabled={loading}
                    />

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => { setCodeStep(1); resetCodeState(); }}
                        className="text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Edit Email
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
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (codeStep === 2 && verificationCode.length !== 6)}
                  className="w-full relative group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-sm shadow-xl shadow-amber-400/10 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{codeStep === 1 ? 'Sending Code...' : 'Verifying Code...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{codeStep === 1 ? 'Send Sign-In Code' : 'Verify & Sign In'}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              /* MODE 3: FORGOT PASSWORD RESET FLOW */
              <motion.form
                key="forgot-mode"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={codeStep === 1 ? handleSendCode : handleResetPasswordSubmit}
                className="space-y-4"
              >
                {codeStep === 1 ? (
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="text-xs font-semibold text-slate-300">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="shaswat@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#08080a] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>6-Digit Reset Code</span>
                      <span className="text-[11px] text-amber-300">Sent to {email}</span>
                      </label>

                      {/* Otp Input */}
                      <OtpInput
                        value={verificationCode}
                        onChange={setVerificationCode}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="reset-password" className="text-xs font-semibold text-slate-300">New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="reset-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          placeholder="••••••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-[#08080a] border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium transition"
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
                      <PasswordStrengthMeter password={newPassword} />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => { setCodeStep(1); resetCodeState(); }}
                        className="text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Edit Email
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
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (codeStep === 2 && (verificationCode.length !== 6 || newPassword.length < 8))}
                  className="w-full relative group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#08080a] font-bold text-sm shadow-xl shadow-amber-400/10 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{codeStep === 1 ? 'Sending Reset Code...' : 'Resetting Password...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{codeStep === 1 ? 'Send Reset Code' : 'Reset Password & Sign In'}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer Link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-4 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginPageInner />
    </Suspense>
  );
}
