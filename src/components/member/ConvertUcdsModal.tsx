import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Mail,
  BookOpen,
  Hash,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  convertExternalToUcds,
  isUsernameAvailable,
  type UserProfile,
} from '@/services/userService';

interface ConvertUcdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onConverted: () => void;
}

const UCDS_INVOLVEMENT_OPTIONS = [
  { id: 'debater', label: 'Debater (Tournaments & Practices)' },
  { id: 'judge', label: 'Judge / Adjudicator' },
  { id: 'general', label: 'General Member (Socials & Events)' },
  { id: 'volunteer', label: 'Volunteer / Committee' },
  { id: 'spectator', label: 'Spectator & Audience' },
];

export const ConvertUcdsModal: React.FC<ConvertUcdsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onConverted,
}) => {
  const { user } = useAuth();

  const [ucid, setUcid] = useState(profile.ucid || '');
  const [ucalgaryEmail, setUcalgaryEmail] = useState(profile['email-ucalgary'] || '');
  const [program, setProgram] = useState(profile.program || '');
  const [yearOfStudy, setYearOfStudy] = useState(
    profile.year && profile.year !== 'Prefer not to say' ? profile.year : ''
  );
  const [preferNotToSayYear, setPreferNotToSayYear] = useState(
    profile.year === 'Prefer not to say'
  );
  const [username, setUsername] = useState(profile.username || '');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    profile.type && profile.type.length > 0 ? profile.type : ['debater', 'general']
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const handleSmoothClose = useCallback(() => {
    if (isSubmitting || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 220);
  }, [isSubmitting, isClosing, onClose]);

  // Close modal on Escape key press
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

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setUcid(profile.ucid || '');
      setUcalgaryEmail(profile['email-ucalgary'] || '');
      setProgram(profile.program || '');
      setYearOfStudy(
        profile.year && profile.year !== 'Prefer not to say' ? profile.year : ''
      );
      setPreferNotToSayYear(profile.year === 'Prefer not to say');
      setUsername(profile.username || '');
      setSelectedRoles(
        profile.type && profile.type.length > 0 ? profile.type : ['debater', 'general']
      );
      setError(null);
      setWarning(null);
      setWarningAcknowledged(false);
      setFieldErrors({});
      setIsClosing(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    const newFieldErrors: Record<string, boolean> = {};

    // 1. Validate UCID (strictly 8 digits)
    const cleanUcid = ucid.trim();
    if (!cleanUcid || !/^\d{8}$/.test(cleanUcid)) {
      newFieldErrors.ucid = true;
      setFieldErrors(newFieldErrors);
      setError('UCID must be exactly 8 digits.');
      return;
    }

    // 2. Validate UCalgary Email
    const cleanUofC = ucalgaryEmail.trim().toLowerCase();
    if (!cleanUofC) {
      newFieldErrors.ucalgaryEmail = true;
      setFieldErrors(newFieldErrors);
      setError('University of Calgary email is required for UCDS student members.');
      return;
    }
    if (!cleanUofC.endsWith('@ucalgary.ca')) {
      newFieldErrors.ucalgaryEmail = true;
      setFieldErrors(newFieldErrors);
      setError('UCalgary email address must end with @ucalgary.ca.');
      return;
    }

    // Standard pattern warning: firstname.lastname[0-9]*@ucalgary.ca
    const ucalgaryPattern = /^[a-z]+\.[a-z]+[0-9]*@ucalgary\.ca$/;
    if (!ucalgaryPattern.test(cleanUofC) && !warningAcknowledged) {
      setWarning(
        'Are you sure this email is formatted correctly? Official UCalgary student emails typically follow firstname.lastname@ucalgary.ca.'
      );
      setWarningAcknowledged(true);
      return;
    }

    // 3. Validate Program
    const cleanProgram = program.trim();
    if (!cleanProgram) {
      newFieldErrors.program = true;
      setFieldErrors(newFieldErrors);
      setError('Please enter your faculty or degree program (e.g., Computer Science, Commerce).');
      return;
    }
    if (cleanProgram.length > 32) {
      newFieldErrors.program = true;
      setFieldErrors(newFieldErrors);
      setError('Program name cannot exceed 32 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(cleanProgram)) {
      newFieldErrors.program = true;
      setFieldErrors(newFieldErrors);
      setError('Program name cannot contain symbols.');
      return;
    }

    // 4. Validate Year
    let finalYear = 'Prefer not to say';
    if (!preferNotToSayYear) {
      const cleanYear = yearOfStudy.trim();
      if (!cleanYear || !/^\d{1,2}$/.test(cleanYear)) {
        newFieldErrors.year = true;
        setFieldErrors(newFieldErrors);
        setError('Please enter your year of study (1-99) or select "Prefer not to say".');
        return;
      }
      finalYear = cleanYear;
    }

    // 5. Check Username availability if new
    const cleanUser = username.trim().toLowerCase();
    if (cleanUser && cleanUser !== (profile.username || '').toLowerCase()) {
      const isAvail = await isUsernameAvailable(cleanUser, user.uid);
      if (!isAvail) {
        newFieldErrors.username = true;
        setFieldErrors(newFieldErrors);
        setError('This username is already taken. Please choose another one.');
        return;
      }
    }

    // 6. Validate Roles
    if (selectedRoles.length === 0) {
      newFieldErrors.roles = true;
      setFieldErrors(newFieldErrors);
      setError('Please select at least one involvement role.');
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await convertExternalToUcds(user.uid, {
        ucid: cleanUcid,
        emailUcalgary: cleanUofC,
        program: cleanProgram,
        year: finalYear,
        username: cleanUser || undefined,
        type: selectedRoles,
      });

      onConverted();
      handleSmoothClose();
    } catch (err: unknown) {
      console.error('Failed to convert account to UCDS:', err);
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
      aria-labelledby="convert-ucds-title"
      onClick={() => !isSubmitting && handleSmoothClose()}
    >
      <div
        className={`modal-org-content max-w-lg max-h-[92vh] flex flex-col border-2 border-[#0075A2]/30 dark:border-[#53afd0]/40 overflow-hidden ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[#1C244C]/10 dark:border-[#53afd0]/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 id="convert-ucds-title" className="text-xl font-black font-title text-[#101426] dark:text-[#F6F6F6]">
                Convert to UCDS Member
              </h3>
              <p className="text-xs font-semibold text-[#0075A2] dark:text-[#53afd0]">
                University of Calgary Student Roster Upgrade
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

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-left">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            Fill out your official University of Calgary student details below to unlock society voting rights, subsidized travel tournament rosters, and society dues eligibility.
          </p>

          {/* Feedback Notices */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {warning && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <div>
                <p>{warning}</p>
                <p className="text-[11px] font-normal opacity-90 mt-0.5">Click "Save & Upgrade Account" again to accept this email address.</p>
              </div>
            </div>
          )}

          {/* Field 1: UCID (8 digits) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1C244C] dark:text-[#F6F6F6]">
              University ID (UCID) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={ucid}
                onChange={(e) => setUcid(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 30012345"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#15162C] border ${
                  fieldErrors.ucid
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#0075A2] dark:focus:border-[#53afd0]'
                } text-[#101426] dark:text-white outline-none transition`}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Must be exactly 8 digits as printed on your Unicard.
            </p>
          </div>

          {/* Field 2: UCalgary Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1C244C] dark:text-[#F6F6F6]">
              UCalgary Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={ucalgaryEmail}
                onChange={(e) => {
                  setUcalgaryEmail(e.target.value);
                  setWarning(null);
                  setWarningAcknowledged(false);
                }}
                placeholder="firstname.lastname@ucalgary.ca"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#15162C] border ${
                  fieldErrors.ucalgaryEmail
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#0075A2] dark:focus:border-[#53afd0]'
                } text-[#101426] dark:text-white outline-none transition`}
              />
            </div>
          </div>

          {/* Field 3: Degree Program / Major */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1C244C] dark:text-[#F6F6F6]">
              Degree Program / Major <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                maxLength={32}
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. Political Science, Haskayne BComm"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#15162C] border ${
                  fieldErrors.program
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-[#0075A2] dark:focus:border-[#53afd0]'
                } text-[#101426] dark:text-white outline-none transition`}
              />
            </div>
          </div>

          {/* Field 4: Year of Study */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1C244C] dark:text-[#F6F6F6]">
              Year of Study <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  disabled={preferNotToSayYear}
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1, 2, 3..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-[#15162C] border ${
                    fieldErrors.year
                      ? 'border-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 focus:border-[#0075A2] dark:focus:border-[#53afd0]'
                  } text-[#101426] dark:text-white outline-none transition disabled:opacity-40`}
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preferNotToSayYear}
                  onChange={(e) => {
                    setPreferNotToSayYear(e.target.checked);
                    if (e.target.checked) setYearOfStudy('');
                  }}
                  className="rounded border-slate-300 text-[#0075A2] focus:ring-[#0075A2] w-4 h-4 cursor-pointer"
                />
                <span>Prefer not to say</span>
              </label>
            </div>
          </div>

          {/* Field 5: Involvement Roles */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1C244C] dark:text-[#F6F6F6]">
              Involvement Interests <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {UCDS_INVOLVEMENT_OPTIONS.map((opt) => {
                const isSelected = selectedRoles.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleRoleToggle(opt.id)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#0075A2]/10 dark:bg-[#53afd0]/20 border-[#0075A2] dark:border-[#53afd0] text-[#0075A2] dark:text-[#53afd0]'
                        : 'bg-white dark:bg-[#15162C] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/20 flex-shrink-0">
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
              className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl font-title font-bold text-sm bg-gradient-to-r from-[#0075A2] to-[#1C244C] hover:from-[#53afd0] hover:to-[#0075A2] text-white shadow-lg shadow-[#0075A2]/30 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Converting...' : 'Save & Upgrade Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertUcdsModal;
