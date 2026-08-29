import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, Sparkles, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, initUserDocument } from '@/services/userService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { FloatingAlert } from './FloatingAlert';

export const MemberLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle, signInWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // If user is already authenticated, check profile status and redirect accordingly
  useEffect(() => {
    if (!user) return;

    getUserProfile(user.uid)
      .then((profile) => {
        if (!profile || !profile.isRegistered) {
          navigate('/member/register', { replace: true });
        } else {
          navigate('/member/portal', { replace: true });
        }
      })
      .catch((err) => {
        console.error('Error fetching user profile upon login check:', err);
      });
  }, [user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your account email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmail(cleanEmail, password);
      // Auth state listener in useEffect will route to portal or register
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // Ensure initial Users doc exists
      if (auth?.currentUser) {
        await initUserDocument(
          auth.currentUser.uid,
          auth.currentUser.email || '',
          auth.currentUser.email || ''
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in was cancelled or failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!auth || !resetEmail.trim()) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
      setResetError(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="member-page-container">
      {/* Floating Top Error Alert with 5s Auto-Fade */}
      <FloatingAlert
        message={error}
        type="error"
        onDismiss={() => setError(null)}
        duration={5000}
      />

      <div className="member-card">
        {/* Header Title */}
        <div className="text-center mb-6">
          <h1 className="member-card-title">Member Login</h1>
          <p className="member-card-subtitle">
            Sign in to access your debate portal, verify memberships, and manage registrations.
          </p>
        </div>

        {/* Google Single Sign-On Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="btn-google-auth"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-[rgba(28,36,76,0.12)] dark:border-[rgba(83,175,208,0.2)]" />
          <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
            or with email
          </span>
          <div className="flex-grow border-t border-[rgba(28,36,76,0.12)] dark:border-[rgba(83,175,208,0.2)]" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              <Mail className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
              <span>Email Address</span>
            </label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="you@ucalgary.ca"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div className="flex items-center justify-between">
              <label className="form-label" htmlFor="login-password">
                <Lock className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                <span>Password</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsResetOpen(true);
                }}
                className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-form-next justify-center mt-3 py-3"
          >
            {isSubmitting ? (
              <span>Signing in...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#53afd0]" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 pt-5 border-t border-[rgba(28,36,76,0.1)] dark:border-[rgba(83,175,208,0.18)] text-center text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            Don't have an account yet?{' '}
          </span>
          <Link
            to="/member/register"
            className="font-bold text-[#0075A2] dark:text-[#53afd0] hover:underline"
          >
            Register here
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isResetOpen && (
        <div className="modal-org-overlay" onClick={() => setIsResetOpen(false)}>
          <div className="modal-org-content max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-title font-bold text-xl text-[#1C244C] dark:text-[#F6F6F6] mb-2">
              Reset Your Password
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Enter your email address and we will send you instructions to reset your password.
            </p>

            {resetSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Password reset link sent! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {resetError && (
                  <div className="form-alert-error">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="reset-email">
                    Account Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    placeholder="you@ucalgary.ca"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="btn-form-back text-sm py-2 px-4"
                    onClick={() => setIsResetOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="btn-form-next text-sm py-2 px-5"
                  >
                    {isResetting ? 'Sending...' : 'Send Reset Link'}
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
