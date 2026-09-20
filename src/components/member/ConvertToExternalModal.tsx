import React, { useState, useEffect, useCallback } from 'react';
import { Globe, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { convertToExternalMember } from '@/services/userService';

interface ConvertToExternalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAffiliation?: string;
  onConverted: () => void;
}

export const ConvertToExternalModal: React.FC<ConvertToExternalModalProps> = ({
  isOpen,
  onClose,
  currentAffiliation = '',
  onConverted,
}) => {
  const { user } = useAuth();
  const [affiliatedOrg, setAffiliatedOrg] = useState(
    currentAffiliation === 'University of Calgary Debate Society' ? '' : currentAffiliation
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSmoothClose = useCallback(() => {
    if (isSubmitting || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 220);
  }, [isSubmitting, isClosing, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleSmoothClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, handleSmoothClose]);

  useEffect(() => {
    if (isOpen) {
      setAffiliatedOrg(
        currentAffiliation === 'University of Calgary Debate Society' ? '' : currentAffiliation
      );
      setError(null);
      setIsClosing(false);
      setIsSubmitting(false);
    }
  }, [isOpen, currentAffiliation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await convertToExternalMember(user.uid, affiliatedOrg.trim());
      onConverted();
      handleSmoothClose();
    } catch (err: unknown) {
      console.error('Failed to convert account to External:', err);
      const msg = err instanceof Error ? err.message : 'Failed to convert account.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`modal-org-overlay ${isClosing ? 'closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-external-title"
      onClick={() => !isSubmitting && handleSmoothClose()}
    >
      <div
        className={`modal-org-content max-w-md p-6 sm:p-7 space-y-5 border-2 border-amber-500/30 dark:border-amber-500/40 shadow-2xl shadow-amber-950/20 dark:shadow-amber-950/40 overflow-hidden ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1C244C]/10 dark:border-[#53afd0]/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 id="convert-external-title" className="text-xl font-black font-title text-[#101426] dark:text-[#F6F6F6]">
                Switch to External Account
              </h3>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                External Member Roster
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSmoothClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/80 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Notice */}
        <div className="p-3.5 rounded-2xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 font-semibold space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 font-black">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Membership Roster Change</span>
          </div>
          <p>
            Converting to an External Account will remove your internal UCalgary student classification and dues requirement. You will participate as an external debater, judge, or visiting speaker.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="form-label text-xs font-bold" htmlFor="external-org">
              Affiliated Institution / Club (Optional)
            </label>
            <input
              id="external-org"
              type="text"
              value={affiliatedOrg}
              onChange={(e) => setAffiliatedOrg(e.target.value)}
              placeholder="e.g. University of Alberta, High School, Independent"
              className="form-input text-xs"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1C244C]/10 dark:border-[#53afd0]/20">
            <button
              type="button"
              onClick={handleSmoothClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl font-title font-bold text-sm bg-slate-200 dark:bg-slate-800 text-[#1C244C] dark:text-[#F6F6F6] hover:bg-slate-300 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-title font-bold text-sm bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Updating...' : 'Confirm Switch to External'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertToExternalModal;
