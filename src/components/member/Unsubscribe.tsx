import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Mail, Check, CheckCircle2, Search, ArrowRight, Shield } from 'lucide-react';
import {
  getSubscriber,
  updateSubscriberLists,
  PUBLIC_MAILING_LISTS,
} from '@/services/userService';
import { FloatingAlert } from './FloatingAlert';

export const Unsubscribe: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get('email') || '';

  const [emailInput, setEmailInput] = useState(urlEmail);
  const [lookupEmail, setLookupEmail] = useState(urlEmail);
  const [activeLists, setActiveLists] = useState<string[]>([]);
  const [isSearched, setIsSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-lookup if email parameter is present in the URL
  useEffect(() => {
    if (urlEmail) {
      handleLookupEmail(urlEmail);
    }
  }, [urlEmail]);

  const handleLookupEmail = async (targetEmail: string) => {
    const clean = targetEmail.trim().toLowerCase();
    if (!clean) {
      setErrorMsg('Please enter an email address to look up.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const subscriber = await getSubscriber(clean);
      setLookupEmail(clean);
      setIsSearched(true);
      if (subscriber) {
        setActiveLists(subscriber.lists || []);
      } else {
        setActiveLists([]);
      }
    } catch (err: unknown) {
      console.error('Error fetching subscriber:', err);
      setErrorMsg('Failed to check subscriber preferences.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleList = (listName: string) => {
    if (activeLists.includes(listName)) {
      setActiveLists(activeLists.filter((l) => l !== listName));
    } else {
      setActiveLists([...activeLists, listName]);
    }
  };

  const handleSavePreferences = async () => {
    if (!lookupEmail) return;

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateSubscriberLists(lookupEmail, activeLists);
      if (activeLists.length === 0) {
        setSuccessMsg(`Successfully unsubscribed ${lookupEmail} from all mailing lists.`);
      } else {
        setSuccessMsg(`Your subscription preferences have been updated.`);
      }
    } catch (err: unknown) {
      console.error('Error updating subscriber lists:', err);
      setErrorMsg('Failed to save subscription preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!lookupEmail) return;
    setActiveLists([]);
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateSubscriberLists(lookupEmail, []);
      setSuccessMsg(`You have been unsubscribed from all mailing lists for ${lookupEmail}.`);
    } catch (err: unknown) {
      console.error('Failed to unsubscribe all:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update preferences.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="member-page-container">
      {/* Floating Top Error Alert with 5s Auto-Fade */}
      <FloatingAlert
        message={errorMsg}
        type="error"
        onDismiss={() => setErrorMsg(null)}
        duration={5000}
      />

      <div className="member-card">
        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(0,117,162,0.12)] dark:bg-[rgba(83,175,208,0.2)] text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="member-card-title">Manage Subscriptions</h1>
          <p className="member-card-subtitle">
            Update your public newsletter and announcement preferences or unsubscribe at any time.
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3 mb-5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Lookup Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookupEmail(emailInput);
          }}
          className="form-group"
        >
          <label className="form-label" htmlFor="unsub-email">
            Enter your subscriber email
          </label>
          <div className="flex items-center gap-2">
            <input
              id="unsub-email"
              type="email"
              required
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="form-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-form-next py-2.5 px-5 text-sm whitespace-nowrap"
            >
              {loading ? 'Searching...' : 'Find Email'}
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* Subscriptions Grid */}
        {isSearched && (
          <div className="mt-6 pt-5 border-t border-[rgba(28,36,76,0.1)] dark:border-[rgba(83,175,208,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Active lists for <span className="font-bold text-[#0075A2] dark:text-[#53afd0]">{lookupEmail}</span>:
              </span>
              <button
                type="button"
                className="btn-bulk-toggle text-xs text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800"
                onClick={handleUnsubscribeAll}
                disabled={isSaving || activeLists.length === 0}
              >
                Unsubscribe from All
              </button>
            </div>

            <div className="tiles-grid-two-col mb-6">
              {PUBLIC_MAILING_LISTS.map((list) => {
                const isChecked = activeLists.includes(list);

                return (
                  <div
                    key={list}
                    className={`select-tile ${isChecked ? 'selected' : ''}`}
                    onClick={() => handleToggleList(list)}
                  >
                    <span>{list}</span>
                    {isChecked ? (
                      <Check className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Off</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(28,36,76,0.08)] dark:border-[rgba(83,175,208,0.15)]">
              <button
                type="button"
                disabled={isSaving}
                className="btn-form-next text-sm py-2.5 px-6"
                onClick={handleSavePreferences}
              >
                {isSaving ? 'Updating...' : 'Save Subscription Preferences'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-5 border-t border-[rgba(28,36,76,0.1)] dark:border-[rgba(83,175,208,0.18)] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Anti-spam compliant (CASL & CAN-SPAM)</span>
          </div>
          <Link
            to="/member/login"
            className="font-bold text-[#0075A2] dark:text-[#53afd0] hover:underline"
          >
            Member Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
