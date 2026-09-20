import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, X, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const { deleteAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresReauth, setRequiresReauth] = useState(false);

  const handleSmoothClose = useCallback(() => {
    if (isDeleting || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 220);
  }, [isDeleting, isClosing, onClose]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        handleSmoothClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, handleSmoothClose]);

  // Reset error states when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRequiresReauth(false);
      setIsDeleting(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setError(null);
    setRequiresReauth(false);
    setIsDeleting(true);

    try {
      await deleteAccount();
      handleSmoothClose();
      if (onDeleted) {
        onDeleted();
      } else {
        navigate('/member/login', { replace: true });
      }
    } catch (err: unknown) {
      console.error('Account deletion error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete account.';
      if (msg.includes('requires-recent-login')) {
        setRequiresReauth(true);
        setError(
          'For security, deleting your account requires recent authentication. Please sign out, log back in, and try again.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReauthSignout = async () => {
    try {
      await logout();
      onClose();
      navigate('/member/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <div
      className={`modal-org-overlay ${isClosing ? 'closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onClick={() => !isDeleting && handleSmoothClose()}
    >
      <div
        className={`modal-org-content max-w-md p-6 sm:p-7 space-y-5 border-2 border-rose-500/40 dark:border-rose-500/60 shadow-2xl shadow-rose-950/20 dark:shadow-rose-950/50 ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleSmoothClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/80 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex items-center gap-3.5 mb-1">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 dark:bg-rose-500/25 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="delete-account-title" className="text-xl font-black font-title text-[#101426] dark:text-[#F6F6F6]">
              Delete Account?
            </h3>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Irreversible Action
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          <p>
            Are you sure you want to permanently delete your account?
          </p>
          <div className="p-3.5 rounded-2xl bg-rose-100/70 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 font-semibold space-y-1.5">
            <p className="font-bold">This will permanently erase:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Your member profile and bio</li>
              <li>Tournament registrations and payment history</li>
              <li>Mailing list linkings and username reservation</li>
            </ul>
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {requiresReauth ? (
            <button
              type="button"
              onClick={handleReauthSignout}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-title font-bold text-sm bg-gradient-to-r from-[#0075A2] to-[#1C244C] text-white hover:brightness-110 shadow-md transition cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign Out to Re-authenticate</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSmoothClose}
                disabled={isDeleting}
                className="py-2.5 px-5 rounded-xl font-title font-bold text-sm bg-slate-200/80 dark:bg-slate-800 text-[#1C244C] dark:text-[#F6F6F6] hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-title font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting Account...' : 'Yes, Delete Account'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
