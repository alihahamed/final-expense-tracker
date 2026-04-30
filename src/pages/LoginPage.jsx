import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LogIn, UserPlus, FileWarning, Loader2, KeyRound,
  ShieldCheck, Mail, Eye, EyeOff, ArrowLeft, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Using window.location.origin ensures redirects work dynamically in both dev and production

// ── Friendly error mapping ─────────────────────────────────────────────────────
const FRIENDLY_ERRORS = {
  'Invalid login credentials':               'Incorrect email or password.',
  'Email not confirmed':                     'Please verify your email before logging in.',
  'User already registered':                 'An account with this email already exists.',
  'Signup requires a valid password':        'Please enter a valid password.',
  'Password should be at least 6 characters':'Password must be at least 8 characters.',
  'For security purposes, you can only request this after':
                                             'Too many requests. Please wait before trying again.',
  'Email rate limit exceeded':               'Too many emails sent. Wait a few minutes.',
  'Token has expired or is invalid':         'Verification code expired or invalid. Please request a new one.',
  'Otp has expired':                         'Verification code expired. Please request a new one.',
};

function friendlyError(rawMsg) {
  if (!rawMsg) return 'Something went wrong. Please try again.';
  for (const [key, val] of Object.entries(FRIENDLY_ERRORS)) {
    if (rawMsg.toLowerCase().includes(key.toLowerCase())) return val;
  }
  if (rawMsg.length > 80) return 'Something went wrong. Please try again.';
  return rawMsg;
}

// ── Password strength ──────────────────────────────────────────────────────────
const PW_RULES = [
  { label: '8+ characters',    test: (pw) => pw.length >= 8 },
  { label: 'Uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Number',           test: (pw) => /\d/.test(pw) },
  { label: 'Special char',     test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(pw) {
  return pw ? PW_RULES.filter((r) => r.test(pw)).length : 0;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-emerald-500'];

function PasswordStrength({ password }) {
  const strength = getStrength(password);
  if (!password) return null;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i <= strength ? STRENGTH_COLORS[strength] : 'bg-muted')} />
        ))}
      </div>
      <div className="flex justify-between items-center mb-1.5">
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', strength <= 1 ? 'text-rose-500' : strength === 2 ? 'text-amber-500' : strength === 3 ? 'text-sky-500' : 'text-emerald-500')}>
          {STRENGTH_LABELS[strength]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {PW_RULES.map((rule) => {
          const pass = rule.test(password);
          return (
            <span key={rule.label} className={cn('text-[10px] font-semibold transition-colors', pass ? 'text-emerald-500' : 'text-muted-foreground/60')}>
              {pass ? '✓' : '○'} {rule.label}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── OTP Input (6 boxes) ────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleKey = (e, idx) => {
    const key = e.key;
    if (key === 'Backspace') {
      e.preventDefault();
      const next = digits.map((d, i) => (i === idx ? '' : d)).join('');
      onChange(next);
      if (idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus();
      return;
    }
    if (key === 'ArrowLeft' && idx > 0) { document.getElementById(`otp-${idx - 1}`)?.focus(); return; }
    if (key === 'ArrowRight' && idx < 5) { document.getElementById(`otp-${idx + 1}`)?.focus(); return; }
    if (/^\d$/.test(key)) {
      e.preventDefault();
      const next = digits.map((d, i) => (i === idx ? key : d)).join('');
      onChange(next);
      if (idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          id={`otp-${idx}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={handlePaste}
          className={cn(
            'w-11 h-12 text-center text-lg font-black rounded-xl border bg-muted text-foreground outline-none transition-all',
            digit ? 'border-primary ring-2 ring-primary/20' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
          )}
        />
      ))}
    </div>
  );
}

// ── Main LoginPage ─────────────────────────────────────────────────────────────
// Views: 'login' | 'signup' | 'forgot' | 'verify-signup' | 'verify-forgot-sent' | 'reset-password'
export function LoginPage({ passwordRecovery = false }) {
  const [view,            setView]            = useState(passwordRecovery ? 'reset-password' : 'login');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [otp,             setOtp]             = useState('');
  const [loading,         setLoading]         = useState(false);
  const [errorMsg,        setErrorMsg]        = useState(null);
  const [successMsg,      setSuccessMsg]      = useState(null);
  const [resendCooldown,  setResendCooldown]  = useState(0);

  const strength        = useMemo(() => getStrength(password), [password]);
  const isPasswordStrong = strength >= 3;

  const clearMessages = () => { setErrorMsg(null); setSuccessMsg(null); };

  const switchView = (newView) => {
    setView(newView);
    clearMessages();
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  // Start resend cooldown (60s)
  const startCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Signup: send OTP to email ────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!isPasswordStrong) {
      setErrorMsg('Please create a stronger password (at least "Good" strength).');
      return;
    }
    setLoading(true);
    try {
      // signUp with email confirmation enabled server-side sends a 6-digit OTP
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;

      // If a session is immediately returned, email confirmation is disabled server-side
      if (data?.session) {
        // Already logged in — App.jsx will pick up the session
        return;
      }
      // No session → email confirmation required — show OTP input
      switchView('verify-signup');
      startCooldown();
    } catch (err) {
      setErrorMsg(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Verify signup OTP ────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    if (otp.length < 6) { setErrorMsg('Please enter the full 6-digit code.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) throw error;
      // Session is now active — App.jsx onAuthStateChange will pick it up
    } catch (err) {
      setErrorMsg(friendlyError(err.message));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    clearMessages();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setSuccessMsg('A new verification code has been sent to your email.');
      startCooldown();
    } catch (err) {
      setErrorMsg(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Extra guard: if email is not confirmed (server-side confirmation enabled)
      if (data?.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        setErrorMsg('Your email is not verified. Please check your inbox for a verification code.');
        switchView('verify-signup');
        startCooldown();
      }
    } catch (err) {
      setErrorMsg(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    clearMessages();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setErrorMsg(friendlyError(error.message));
  };

  // ── Forgot password ──────────────────────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      // Always show success to prevent email enumeration
    } catch (_) {}
    setSuccessMsg("If an account exists, we've sent a reset link. Check your inbox & spam.");
    setLoading(false);
  };

  // ── Reset password (from recovery link) ─────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!isPasswordStrong) { setErrorMsg('Please create a stronger password.'); return; }
    if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMsg('Password updated! Redirecting…');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setErrorMsg(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const isLogin         = view === 'login';
  const isSignup        = view === 'signup';
  const isForgot        = view === 'forgot';
  const isVerifySignup  = view === 'verify-signup';
  const isResetPassword = view === 'reset-password';

  const handleSubmit = isLogin         ? handleLogin
    : isSignup       ? handleSignup
    : isForgot       ? handleForgotPassword
    : isVerifySignup ? handleVerifyOtp
    : isResetPassword ? handleResetPassword
    : (e) => e.preventDefault();

  const inputCls = 'w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/50 placeholder:font-medium';
  const labelCls = 'text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block';

  return (
    <div className="flex h-screen w-full items-center justify-center p-4 bg-background overflow-hidden relative">

      {/* Subtle background grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none">
        <svg width="100%" height="100%"><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[420px] z-10">

        {/* Logo */}
        <div className="flex items-end gap-2 mb-8 px-2">
          <div className="w-10 h-10 border-4 border-primary rounded-xl bg-primary/10 flex items-center justify-center">
            <div className="w-4 h-4 bg-primary rounded-sm" />
          </div>
          <h1 className="text-4xl font-black tracking-tight leading-none text-foreground uppercase">Kinetic</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-sm">

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-5"
            >
              {/* Header */}
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {isLogin         && 'Access System'}
                  {isSignup        && 'Initialize Account'}
                  {isForgot        && 'Reset Password'}
                  {isVerifySignup  && 'Verify Your Email'}
                  {isResetPassword && 'Set New Password'}
                </h2>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {isLogin         && 'Enter your credentials to continue.'}
                  {isSignup        && 'Create a new account. Email verification required.'}
                  {isForgot        && "We'll send a reset link to your email."}
                  {isVerifySignup  && `Enter the 6-digit code sent to ${email}`}
                  {isResetPassword && 'Choose a strong new password.'}
                </p>
              </div>

              {/* Messages */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex gap-3 text-rose-500 items-start overflow-hidden">
                    <FileWarning size={16} className="mt-0.5 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{errorMsg}</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex gap-3 text-emerald-500 items-start overflow-hidden">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── OTP Verification view ─────────────────────────────────────── */}
              {isVerifySignup && (
                <div className="flex flex-col gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Mail size={24} className="text-primary" />
                  </div>

                  <OtpInput value={otp} onChange={setOtp} />

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {loading ? 'Verifying…' : 'Verify Email'}
                  </button>

                  {/* Resend */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || loading}
                      className="text-[11px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                    <span className="text-muted-foreground/30">·</span>
                    <button type="button" onClick={() => switchView('login')} className="text-[11px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors flex items-center gap-1">
                      <ArrowLeft size={11} /> Back
                    </button>
                  </div>
                </div>
              )}

              {/* ── Reset password view ───────────────────────────────────────── */}
              {isResetPassword && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 px-1">
                    <Lock size={14} className="text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Choose a new password</span>
                  </div>
                  <div>
                    <label className={labelCls}>New Password</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={cn(inputCls, 'pr-10')} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="mt-2"><PasswordStrength password={password} /></div>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password</label>
                    <input type={showPassword ? 'text' : 'password'} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={cn(inputCls, confirmPassword && password !== confirmPassword && 'ring-2 ring-rose-400/50')} placeholder="••••••••" />
                    {confirmPassword && password !== confirmPassword && <p className="text-[10px] font-bold text-rose-500 mt-1">Passwords do not match</p>}
                  </div>
                  <button type="submit" disabled={loading || !isPasswordStrong || password !== confirmPassword} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {loading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              )}

              {/* ── Login / Signup / Forgot views ─────────────────────────────── */}
              {(isLogin || isSignup || isForgot) && (
                <div className="flex flex-col gap-4">
                  {/* Email */}
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" autoComplete="email" />
                  </div>

                  {/* Password */}
                  {!isForgot && (
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className={labelCls}>Password</label>
                        {isLogin && (
                          <button type="button" onClick={() => switchView('forgot')} className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">FORGOT?</button>
                        )}
                      </div>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} required minLength={isSignup ? 8 : 6} value={password} onChange={(e) => setPassword(e.target.value)} className={cn(inputCls, 'pr-10')} placeholder="••••••••" autoComplete={isLogin ? 'current-password' : 'new-password'} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {isSignup && (
                        <div className="mt-2">
                          <AnimatePresence><PasswordStrength password={password} /></AnimatePresence>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit */}
                  <button type="submit" disabled={loading || (isSignup && !isPasswordStrong)} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : isForgot ? <KeyRound size={16} /> : isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
                    {loading ? 'Processing…' : isForgot ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                  </button>

                  {/* View switcher */}
                  <div className="flex items-center justify-center pt-1">
                    <button type="button" onClick={() => { if (isForgot) switchView('login'); else if (isLogin) switchView('signup'); else switchView('login'); }} className="text-[11px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors">
                      {isForgot ? 'Back to Login' : isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                    </button>
                  </div>

                  {/* Google OAuth divider + button */}
                  {(isLogin || isSignup) && (
                    <>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border bg-muted hover:bg-muted/70 text-foreground text-sm font-bold transition-all"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98Z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
                        </svg>
                        Continue with Google
                      </button>
                    </>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
