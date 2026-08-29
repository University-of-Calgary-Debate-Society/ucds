import React, { useState, useEffect } from 'react';
import { Flame, LogIn, LogOut, User as UserIcon, Calendar, MapPin, Tag, RefreshCw, Key } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isFirebaseConfigured, firebaseConfig } from '@/lib/firebase';
import { getDebateEvents, type DebateEvent } from '@/services/firestore';
import { StatusBadge } from './StatusBadge';

export const FirebaseDemo: React.FC = () => {
  const { user, signInWithGoogle, logout, authError, clearError } = useAuth();
  const [events, setEvents] = useState<DebateEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const isConfigured = isFirebaseConfigured();

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const data = await getDebateEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Firebase Integration</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Modular Auth & Firestore SDK setup
            </p>
          </div>
        </div>
        <StatusBadge
          status={isConfigured ? 'ready' : 'warning'}
          text={isConfigured ? 'Live Backend Connected' : 'Ready (Using Dev Mock)'}
        />
      </div>

      {/* Configuration Status Card */}
      <div className="my-5 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
          <span className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            Environment Variables
          </span>
          <span className="font-mono text-[11px] text-slate-400">.env.local / GitHub Secrets</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex justify-between">
            <span className="text-slate-500">PROJECT_ID:</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
              {firebaseConfig.projectId || 'Not set'}
            </span>
          </div>
          <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex justify-between">
            <span className="text-slate-500">AUTH_DOMAIN:</span>
            <span className="text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
              {firebaseConfig.authDomain || 'Not set'}
            </span>
          </div>
        </div>
      </div>

      {/* Auth Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-red-500" />
          Authentication State
        </h4>

        {authError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex justify-between items-center">
            <span>{authError}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
          </div>
        )}

        {user ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-emerald-400" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">
                  {user.displayName || 'Authenticated Member'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => signInWithGoogle()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-semibold transition shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Google OAuth
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isConfigured ? 'Ready for live Google OAuth logins' : 'Connect real Firebase keys to test Google Sign-in'}
            </span>
          </div>
        )}
      </div>

      {/* Firestore Sample Data */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-500" />
            UCDS Debate Events & Tournaments (Firestore Model)
          </h4>
          <button
            onClick={loadEvents}
            disabled={loadingEvents}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    {evt.title}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    <Tag className="w-2.5 h-2.5" />
                    {evt.format}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {evt.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {evt.location}
                  </span>
                </div>
              </div>

              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  evt.registrationOpen
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {evt.registrationOpen ? 'Registration Open' : 'Upcoming'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
