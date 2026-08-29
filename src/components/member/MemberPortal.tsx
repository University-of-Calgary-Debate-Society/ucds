import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  GraduationCap,
  LogOut,
  Check,
  Edit2,
  Tag,
  ShieldCheck,
  CreditCard,
  User,
  CalendarDays,
  Sparkles,
  ExternalLink,
  Award,
  AlertTriangle,
  X,
  FileText,
  Clock,
  ArrowRight,
  Copy,
  CheckCheck,
  Building2,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserProfile,
  updateUserProfile,
  isUsernameAvailable,
  syncSubscriberDoc,
  getSubscriber,
  PUBLIC_MAILING_LISTS,
  type UserProfile,
} from '@/services/userService';
import { redirectToStripeCheckout } from '@/services/stripeService';
import {
  getUserPayableItems,
  syncUserMembershipFeeStatus,
  ensureMembershipFeeDoc,
  DEFAULT_MEMBERSHIP_FEE_ID,
  type UserPayableItem,
} from '@/services/paymentsService';
import { LoadingScreen } from '@/components/LoadingScreen';
import { FloatingAlert } from './FloatingAlert';
import { PayPalButton } from './PayPalButton';

type PortalTab = 'profile' | 'mailing' | 'forms' | 'registrations' | 'payments';

export const MemberPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<PortalTab>('profile');

  // Dynamic Payable Items from Firestore Payments collection
  const [payableItems, setPayableItems] = useState<UserPayableItem[]>([]);
  const [selectedPayableId, setSelectedPayableId] = useState<string>(DEFAULT_MEMBERSHIP_FEE_ID);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Payment Modals State
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState(false);
  const [isInteracModalOpen, setIsInteracModalOpen] = useState(false);

  // Copy Feedback States
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedRecipient, setCopiedRecipient] = useState(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [commEmail, setCommEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [program, setProgram] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [pronounOption, setPronounOption] = useState('He/Him');
  const [customSubject, setCustomSubject] = useState('');
  const [customObject, setCustomObject] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);

  // Graduation Modal State (UCDS Only)
  const [isGradModalOpen, setIsGradModalOpen] = useState(false);
  const [gradStep, setGradStep] = useState<number>(0);
  const [isGraduating, setIsGraduating] = useState(false);

  // Mailing list subscriptions state
  const [subscriberLists, setSubscriberLists] = useState<string[]>([]);
  const [isUpdatingLists, setIsUpdatingLists] = useState(false);

  // Feedback alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to load dynamic payable items from Firestore
  const loadUserPayments = async (userProf: UserProfile, email: string) => {
    try {
      setLoadingPayments(true);
      await ensureMembershipFeeDoc();
      await syncUserMembershipFeeStatus(userProf, email);
      const items = await getUserPayableItems(userProf, email);
      setPayableItems(items);
      if (items.length > 0) {
        setSelectedPayableId((prev) => {
          const exists = items.some((i) => i.id === prev);
          return exists ? prev : items[0].id;
        });
      }
    } catch (err) {
      console.warn('Failed to load user payments from Firestore:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Fetch live user profile and subscriber info
  useEffect(() => {
    if (!user) {
      navigate('/member/login', { replace: true });
      return;
    }

    setLoading(true);
    getUserProfile(user.uid)
      .then(async (data) => {
        if (!data || !data.isRegistered) {
          navigate('/member/register', { replace: true });
          return;
        }

        setProfile(data);
        setFirstName(data['name-first'] || '');
        setLastName(data['name-last'] || '');
        setUsername(data.username || '');
        setCommEmail(data['email-preferred'] || user.email || '');
        setPhone(data.phone || '');
        setProgram(data.program || '');
        setYearOfStudy(data.year || '');
        setRoles(data.type || []);

        // Parse pronouns
        if (data.pronouns?.subject && data.pronouns?.object) {
          const sub = data.pronouns.subject.toLowerCase();
          const obj = data.pronouns.object.toLowerCase();
          if (sub === 'he' && obj === 'him') setPronounOption('He/Him');
          else if (sub === 'she' && obj === 'her') setPronounOption('She/Her');
          else if (sub === 'they' && obj === 'them') setPronounOption('They/Them');
          else {
            setPronounOption('Custom');
            setCustomSubject(data.pronouns.subject);
            setCustomObject(data.pronouns.object);
          }
        } else {
          setPronounOption('Prefer not to say');
        }

        // Fetch mailing lists
        const targetEmail = data['email-preferred'] || user.email || '';
        if (targetEmail) {
          getSubscriber(targetEmail).then((subDoc) => {
            if (subDoc) {
              setSubscriberLists(subDoc.lists || []);
            }
          });
        }

        // Fetch user payable bills from Firestore
        await loadUserPayments(data, targetEmail);

        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setLoading(false);
      });
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/member/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isAlumni = Boolean(
    profile?.type && profile.type.some((r) => r.toLowerCase() === 'alumni')
  );

  const isDuesExempt = Boolean(
    isAlumni || profile?.isExecutive || !profile?.isUCDS
  );

  const copyToClipboard = (text: string, type: 'memo' | 'recipient') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'memo') {
        setCopiedMemo(true);
        setTimeout(() => setCopiedMemo(false), 2500);
      } else {
        setCopiedRecipient(true);
        setTimeout(() => setCopiedRecipient(false), 2500);
      }
    });
  };

  // Graduation Multi-Click Handler
  const handleGraduationStep = async () => {
    if (!user || !profile) return;

    if (gradStep < 2) {
      setGradStep((prev) => prev + 1);
      return;
    }

    // Step 2 reached: "Graduate me already!"
    setIsGraduating(true);
    try {
      const currentRoles = profile.type || [];
      const updatedRoles = currentRoles.some((r) => r.toLowerCase() === 'alumni')
        ? currentRoles
        : [...currentRoles, 'alumni'];

      await updateUserProfile(user.uid, {
        type: updatedRoles,
      });

      setProfile((prev) => (prev ? { ...prev, type: updatedRoles } : null));
      setRoles(updatedRoles);
      setIsGradModalOpen(false);
      setGradStep(0);
      setSuccess('Congratulations! You have officially graduated and are now registered as an Alumnus.');
    } catch (err: unknown) {
      console.error('Failed to update graduation status:', err);
      const msg = err instanceof Error ? err.message : 'Failed to process graduation.';
      setError(msg);
    } finally {
      setIsGraduating(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setError(null);
    setSuccess(null);

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanComm = commEmail.trim().toLowerCase();

    if (!cleanFirst || !cleanLast) {
      setError('First and last names cannot be empty.');
      return;
    }
    if (cleanFirst.length > 16 || cleanLast.length > 16) {
      setError('Names cannot exceed 16 characters.');
      return;
    }
    if (!cleanUser) {
      setError('Username cannot be empty.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUser)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    // Uniqueness validation if changed
    if (cleanUser !== profile.username) {
      const isAvail = await isUsernameAvailable(cleanUser, user.uid);
      if (!isAvail) {
        setError('This username is already taken. Please choose another one.');
        return;
      }
    }

    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    // Pronouns
    let pronounsObj = { object: '', subject: '' };
    if (pronounOption === 'He/Him') pronounsObj = { object: 'him', subject: 'he' };
    else if (pronounOption === 'She/Her') pronounsObj = { object: 'her', subject: 'she' };
    else if (pronounOption === 'They/Them') pronounsObj = { object: 'them', subject: 'they' };
    else if (pronounOption === 'Custom') {
      pronounsObj = {
        object: customObject.trim().toLowerCase(),
        subject: customSubject.trim().toLowerCase(),
      };
    }

    setIsSaving(true);
    try {
      let safeRoles = [...roles];
      if (isAlumni && !safeRoles.some((r) => r.toLowerCase() === 'alumni')) {
        safeRoles.push('alumni');
      }

      const updatedFields: Partial<UserProfile> = {
        'name-first': cleanFirst,
        'name-last': cleanLast,
        username: cleanUser,
        'email-preferred': cleanComm,
        phone: phone.trim(),
        pronouns: pronounsObj,
        program: program.trim(),
        year: yearOfStudy.trim(),
        type: safeRoles,
      };

      await updateUserProfile(user.uid, updatedFields);
      setProfile((prev) => (prev ? { ...prev, ...updatedFields } : null));

      await syncSubscriberDoc(
        cleanComm,
        cleanFirst,
        cleanLast,
        subscriberLists,
        true
      );

      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save changes.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMailingList = async (listName: string) => {
    if (!profile) return;
    const targetEmail = profile['email-preferred'] || user?.email || '';
    if (!targetEmail) return;

    const nextLists = subscriberLists.includes(listName)
      ? subscriberLists.filter((l) => l !== listName)
      : [...subscriberLists, listName];

    setSubscriberLists(nextLists);
    setIsUpdatingLists(true);

    try {
      await syncSubscriberDoc(
        targetEmail,
        profile['name-first'] || '',
        profile['name-last'] || '',
        nextLists,
        true
      );
    } catch (err) {
      console.error('Failed to update mailing lists:', err);
    } finally {
      setIsUpdatingLists(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your Member Portal..." />;
  }

  if (!profile) return null;

  const stockRolesOptions = profile.isUCDS
    ? ['debater', 'judge', 'volunteer', 'general', 'spectator']
    : [
      'independent adjudicator',
      'debater',
      'judge',
      'organizational committee member',
      'high school student',
      'coach',
      'junior high student',
    ];

  const getGradButtonText = () => {
    if (gradStep === 0) return "I'm Sure";
    if (gradStep === 1) return "I'm Really Sure";
    return 'Graduate me already!';
  };

  const selectedItem: UserPayableItem =
    payableItems.find((item) => item.id === selectedPayableId) ||
    payableItems[0] || {
      id: DEFAULT_MEMBERSHIP_FEE_ID,
      title: 'UCDS Society Annual Membership Dues (2026/2027)',
      category: 'Society Dues',
      amountCents: 2500,
      amountFormatted: '$25.00 CAD',
      description:
        'Official membership registration for the full academic year. Grants tournament eligibility, coaching access, voting privileges at AGM, and society social event entry.',
      allowedPayments: ['etransfer', 'paypal', 'stripe'],
      isMembershipDues: true,
      statusText: isDuesExempt
        ? 'Dues Exempt'
        : profile.isPaid
          ? 'Verified & Paid'
          : 'Payment Required',
      statusType: isDuesExempt ? 'exempt' : profile.isPaid ? 'paid' : 'unpaid',
      isListed: true,
    };

  const memberLoginEmail = profile['email-login'] || user?.email || 'your-login-email';

  return (
    <div className="member-page-container portal-container">
      {/* Floating Top Alerts */}
      <FloatingAlert
        message={error}
        type="error"
        onDismiss={() => setError(null)}
        duration={5000}
      />
      <FloatingAlert
        message={success}
        type="success"
        onDismiss={() => setSuccess(null)}
        duration={5000}
      />

      <div className="portal-dashboard-grid">
        {/* Top Profile Header Card (Crisp Off-White in Light Mode) */}
        <div className="member-card max-w-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="member-card-title text-2xl sm:text-3xl text-[#101426] dark:text-[#F6F6F6]">
                {profile['name-first']} {profile['name-last']}
              </h1>
              <p className="text-sm font-extrabold text-[#0075A2] dark:text-[#53afd0] mt-0.5">
                @{profile.username || 'member'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'profile' && (
                <button
                  type="button"
                  className="btn-bulk-toggle flex items-center gap-2 py-2 px-4 text-xs font-bold"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Status Banners */}
          <div className="portal-status-banner mt-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`status-tag ${profile.isUCDS ? 'status-tag-active' : 'status-tag-pending'}`}>
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{profile.isUCDS ? 'UCalgary Member' : 'External Member'}</span>
              </span>

              <span className={`status-tag ${isDuesExempt || profile.isPaid ? 'status-tag-active' : 'status-tag-pending'}`}>
                <CreditCard className="w-3.5 h-3.5" />
                <span>
                  {isAlumni
                    ? 'Alumni (Dues Exempt)'
                    : profile.isExecutive
                      ? 'Executive (Dues Exempt)'
                      : profile.isPaid
                        ? 'Membership Dues Paid'
                        : 'Dues Unpaid'}
                </span>
              </span>

              {profile.isExecutive && (
                <span className="status-tag status-tag-active bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Executive Officer</span>
                </span>
              )}

              {isAlumni && (
                <span className="status-tag status-tag-active bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300">
                  <Award className="w-3.5 h-3.5" />
                  <span>Alumnus</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 5-Tab Slider (Exact same 860px width as main body cards) */}
        <div className="portal-tab-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={`portal-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mailing'}
            className={`portal-tab-btn ${activeTab === 'mailing' ? 'active' : ''}`}
            onClick={() => setActiveTab('mailing')}
          >
            <Mail className="w-4 h-4" />
            <span>Mailing Lists</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'forms'}
            className={`portal-tab-btn ${activeTab === 'forms' ? 'active' : ''}`}
            onClick={() => setActiveTab('forms')}
          >
            <FileText className="w-4 h-4" />
            <span>Forms</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'registrations'}
            className={`portal-tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('registrations')}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Registrations</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'payments'}
            className={`portal-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments</span>
          </button>
        </div>

        {/* TAB 1: PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="member-card max-w-none transition-all duration-300 animate-viewFadeIn">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.22)]">
              <h2 className="member-card-title text-2xl transition-all duration-300 text-[#101426] dark:text-[#F6F6F6]">
                {isEditing ? 'Edit Profile Details' : 'Account Overview'}
              </h2>
            </div>

            <div className="portal-edit-view-container">
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4 animate-viewFadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-first">First Name *</label>
                      <input
                        id="edit-first"
                        type="text"
                        required
                        maxLength={16}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-last">Last Name *</label>
                      <input
                        id="edit-last"
                        type="text"
                        required
                        maxLength={16}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-user">Username *</label>
                      <input
                        id="edit-user"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-email">Preferred Email *</label>
                      <input
                        id="edit-email"
                        type="email"
                        required
                        value={commEmail}
                        onChange={(e) => setCommEmail(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-phone">Phone Number</label>
                      <input
                        id="edit-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit phone"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-program">Program / Major</label>
                      <input
                        id="edit-program"
                        type="text"
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        placeholder="e.g. Political Science"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-year">Year of Study</label>
                      <select
                        id="edit-year"
                        value={yearOfStudy}
                        onChange={(e) => setYearOfStudy(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="5+">5th+ Year</option>
                        <option value="Graduate">Graduate / PhD</option>
                        <option value="Alumni">Alumni</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-pronouns">Pronouns</label>
                      <select
                        id="edit-pronouns"
                        value={pronounOption}
                        onChange={(e) => setPronounOption(e.target.value)}
                        className="form-select"
                      >
                        <option value="He/Him">He / Him</option>
                        <option value="She/Her">She / Her</option>
                        <option value="They/Them">They / Them</option>
                        <option value="Custom">Custom</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  {pronounOption === 'Custom' && (
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                      <div className="form-group">
                        <label className="form-label text-xs" htmlFor="edit-custom-sub">Subject (e.g. 'ze')</label>
                        <input
                          id="edit-custom-sub"
                          type="text"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-xs" htmlFor="edit-custom-obj">Object (e.g. 'zir')</label>
                        <input
                          id="edit-custom-obj"
                          type="text"
                          value={customObject}
                          onChange={(e) => setCustomObject(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>
                  )}

                  {/* Roles Selection Tile Trigger */}
                  <div className="form-group">
                    <label className="form-label">Member Participation Roles</label>
                    <div
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 cursor-pointer flex items-center justify-between hover:border-[#0075A2]"
                      onClick={() => setIsRolesModalOpen(true)}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {roles.length > 0 ? (
                          roles.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded-md bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] text-xs font-bold capitalize"
                            >
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No roles selected</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0]">Modify</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.22)]">
                    <button
                      type="button"
                      className="btn-form-back text-xs py-2 px-4"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-form-next text-xs py-2 px-6 font-bold flex items-center gap-2"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Profile Overview Cards */
                <div className="overview-fields-grid animate-viewFadeIn">
                  <div className="overview-field-item">
                    <span className="overview-field-label">Preferred Email</span>
                    <span className="overview-field-value">{profile['email-preferred'] || profile['email-login']}</span>
                  </div>

                  <div className="overview-field-item">
                    <span className="overview-field-label">Login Account Email</span>
                    <span className="overview-field-value font-mono text-sm">{profile['email-login']}</span>
                  </div>

                  {profile['email-ucalgary'] && (
                    <div className="overview-field-item">
                      <span className="overview-field-label">UCalgary Student Email</span>
                      <span className="overview-field-value">{profile['email-ucalgary']}</span>
                    </div>
                  )}

                  {profile.phone && (
                    <div className="overview-field-item">
                      <span className="overview-field-label">Phone Number</span>
                      <span className="overview-field-value">{profile.phone}</span>
                    </div>
                  )}

                  <div className="overview-field-item">
                    <span className="overview-field-label">Program & Major</span>
                    <span className="overview-field-value">{profile.program || 'Not Specified'}</span>
                  </div>

                  <div className="overview-field-item">
                    <span className="overview-field-label">Year of Study</span>
                    <span className="overview-field-value">{profile.year || 'Not Specified'}</span>
                  </div>

                  <div className="overview-field-item">
                    <span className="overview-field-label">Pronouns</span>
                    <span className="overview-field-value">
                      {profile.pronouns?.subject && profile.pronouns?.object
                        ? `${profile.pronouns.subject} / ${profile.pronouns.object}`
                        : 'Prefer not to say'}
                    </span>
                  </div>

                  <div className="overview-field-item sm:col-span-2">
                    <span className="overview-field-label mb-1">Participation Roles</span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {profile.type && profile.type.length > 0 ? (
                        profile.type.map((role) => (
                          <span
                            key={role}
                            className="px-3 py-1 rounded-lg bg-[rgba(0,117,162,0.1)] dark:bg-[rgba(83,175,208,0.2)] text-[#0075A2] dark:text-[#53afd0] text-xs font-bold capitalize"
                          >
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No roles selected</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MAILING LISTS TAB */}
        {activeTab === 'mailing' && (
          <div className="member-card max-w-none animate-viewFadeIn space-y-6">
            <div className="pb-4 border-b border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.22)]">
              <h2 className="member-card-title text-2xl text-[#101426] dark:text-[#F6F6F6]">
                Society Mailing Lists & Communications
              </h2>
              <p className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0] mt-0.5">
                Toggle your newsletter, tournament briefing, and workshop notifications.
              </p>
            </div>

            <div className="space-y-3">
              {PUBLIC_MAILING_LISTS.map((listName) => {
                const isSubscribed = subscriberLists.includes(listName);

                return (
                  <div
                    key={listName}
                    className="portal-subcard p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 transition-all duration-200 hover:border-[#0075A2]/60 shadow-xs"
                  >
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2.5">
                        <Tag className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                        <h3 className="font-title font-black text-base text-[#101426] dark:text-[#F6F6F6]">
                          {listName}
                        </h3>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                        {listName === 'General'
                          ? 'General club notices and society-wide announcements.'
                          : listName === 'Newsletter'
                            ? 'Bi-weekly digests covering campus debates, tournament recaps, and member spotlights.'
                            : listName === 'UCDS Events'
                              ? 'Invitational registrations, internal workshop schedules, and social mixers.'
                              : listName === 'Opportunities'
                                ? 'Scholarships, international debate tours, and coaching invitations.'
                                : listName === 'Blog'
                                  ? 'Articles, debate strategy guides, and motion breakdown essays.'
                                  : 'Adjudication rosters, training modules, and youth championship updates.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isUpdatingLists}
                      onClick={() => handleToggleMailingList(listName)}
                      className={`btn-mailing-toggle py-2 px-5 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 ${isSubscribed
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                          : 'btn-form-back hover:border-[#0075A2]'
                        }`}
                    >
                      {isSubscribed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Subscribed</span>
                        </>
                      ) : (
                        <span>Subscribe</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: FORMS TAB (Crisp Off-White in Light Mode) */}
        {activeTab === 'forms' && (
          <div className="member-card max-w-none animate-viewFadeIn space-y-6">
            <div className="pb-4 border-b border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.22)]">
              <h2 className="member-card-title text-2xl text-[#101426] dark:text-[#F6F6F6]">
                Society Documents & Member Forms
              </h2>
              <p className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0] mt-0.5">
                Submit reimbursement requests, executive applications, and member feedback surveys.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Form 1 */}
              <div className="portal-subcard p-5 flex flex-col justify-between space-y-3 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0]">
                      Finance
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300">
                      Open
                    </span>
                  </div>
                  <h3 className="font-title font-black text-base text-[#101426] dark:text-[#F6F6F6]">
                    Tournament Expense Reimbursement Form
                  </h3>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                    Submit judging honoraria, travel transport, and registration fee receipts for VP Finance approval.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Reimbursement form submissions will open alongside tournament travel rosters.')}
                  className="btn-bulk-toggle py-2 px-3 text-xs font-bold flex items-center justify-between w-full mt-2"
                >
                  <span>Open Form</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form 2 */}
              <div className="portal-subcard p-5 flex flex-col justify-between space-y-3 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0]">
                      Leadership
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
                      Opens March
                    </span>
                  </div>
                  <h3 className="font-title font-black text-base text-[#101426] dark:text-[#F6F6F6]">
                    2026/2027 Executive Board Nomination
                  </h3>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                    Apply to run for society executive positions (President, VP Internal, VP Finance, VP Events, VP Training).
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="btn-form-back py-2 px-3 text-xs font-bold flex items-center justify-between w-full opacity-60 cursor-not-allowed mt-2"
                >
                  <span>Closed</span>
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form 3 */}
              <div className="portal-subcard p-5 flex flex-col justify-between space-y-3 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0]">
                      Community
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  <h3 className="font-title font-black text-base text-[#101426] dark:text-[#F6F6F6]">
                    Weekly Training & Workshop Feedback
                  </h3>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                    Share motion suggestions, seminar topic requests, and practice feedback with the training team.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Feedback survey will open in the next workshop cycle.')}
                  className="btn-bulk-toggle py-2 px-3 text-xs font-bold flex items-center justify-between w-full mt-2"
                >
                  <span>Provide Feedback</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form 4 */}
              <div className="portal-subcard p-5 flex flex-col justify-between space-y-3 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0]">
                      Volunteering
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  <h3 className="font-title font-black text-base text-[#101426] dark:text-[#F6F6F6]">
                    High School Tournament Judging Volunteer
                  </h3>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                    Sign up for volunteer judging slots at the upcoming Calgary High School Open debate rounds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alert('Volunteer roster registration will be active on September 1st.')}
                  className="btn-bulk-toggle py-2 px-3 text-xs font-bold flex items-center justify-between w-full mt-2"
                >
                  <span>Sign Up to Judge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REGISTRATIONS TAB (Crisp Off-White in Light Mode) */}
        {activeTab === 'registrations' && (
          <div className="member-card max-w-none animate-viewFadeIn">
            <div className="pb-4 mb-6 border-b border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.22)]">
              <h2 className="member-card-title text-2xl text-[#101426] dark:text-[#F6F6F6]">
                Event & Tournament Registrations
              </h2>
              <p className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0] mt-0.5">
                Track and manage your registrations for society practices, high school opens, and university invitationals.
              </p>
            </div>

            {/* Crisp Off-White Container in Light Mode */}
            <div className="portal-subcard-dashed py-12 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[rgba(0,117,162,0.1)] dark:bg-[rgba(83,175,208,0.15)] text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center">
                <CalendarDays className="w-7 h-7" />
              </div>
              <h3 className="font-title font-black text-lg text-[#101426] dark:text-[#F6F6F6]">
                No Active Registrations
              </h3>
              <p className="text-xs max-w-md font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                You do not have any pending tournament or workshop registrations. When new events open for sign-up, your registrations and team partner pairings will appear here.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: MULTI-ITEM PAYMENTS TAB (Dynamic from Firestore Payments Collection) */}
        {activeTab === 'payments' && (
          <div className="member-card max-w-none animate-viewFadeIn space-y-6">
            <div className="pb-4 border-b border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.22)]">
              <h2 className="member-card-title text-2xl text-[#101426] dark:text-[#F6F6F6]">
                Membership Dues & Payments
              </h2>
              <p className="text-xs font-bold text-[#0075A2] dark:text-[#53afd0] mt-0.5">
                Select an item below to view details and proceed with secure online payment or bank transfer.
              </p>
            </div>

            {/* Payable Items Catalog Selector */}
            <div className="space-y-3">
              <span className="text-xs font-black text-[#0075A2] dark:text-[#53afd0] uppercase tracking-wider block">
                Select Item to Pay
              </span>
              {loadingPayments ? (
                <div className="p-8 text-center text-xs font-bold text-[#0075A2] dark:text-[#53afd0]">
                  Loading society bills and dues...
                </div>
              ) : payableItems.length === 0 ? (
                <div className="portal-subcard p-6 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  You have no pending payments or dues associated with your account.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {payableItems.map((item) => {
                    const isSelected = item.id === selectedPayableId;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedPayableId(item.id)}
                        className={`payable-catalog-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0]">
                            {item.category}
                          </span>
                          <span
                            className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${item.statusType === 'paid' || item.statusType === 'exempt'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300'
                                : item.statusType === 'unpaid'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                          >
                            {item.statusText}
                          </span>
                        </div>

                        <div>
                          <h4 className="payable-catalog-title line-clamp-1">
                            {item.title}
                          </h4>
                          <p className="payable-catalog-amount">
                            {item.amountFormatted}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detailed View of the Selected Item (Explicit High-Contrast) */}
            <div className="payable-details-card space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b-2 border-[rgba(28,36,76,0.1)] dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-xs font-black text-[#0075A2] dark:text-[#53afd0] uppercase tracking-wider">
                    {selectedItem.category} Details
                  </span>
                  <h3 className="payable-details-title">
                    {selectedItem.title}
                  </h3>
                  <p className="payable-details-desc max-w-2xl leading-relaxed">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="text-right">
                  <span className="payable-details-amount">
                    {selectedItem.amountFormatted}
                  </span>
                </div>
              </div>

              {/* Status Notice */}
              {selectedItem.isMembershipDues ? (
                profile.isPaid || isDuesExempt ? (
                  <div className="p-4 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-700 flex items-center gap-3 text-emerald-950 dark:text-emerald-100">
                    <Check className="w-5 h-5 flex-shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <div>
                      <p className="font-title font-black text-sm">
                        {isAlumni
                          ? 'Alumni Lifetime Membership Exemption Active'
                          : profile.isExecutive
                            ? 'Executive Officer Dues Exemption Active'
                            : !profile.isUCDS
                              ? 'External / General Account — No Society Dues Required'
                              : 'Annual Society Membership Dues Fully Paid & Verified'}
                      </p>
                      <p className="text-xs font-semibold opacity-95">
                        {profile.isPaid
                          ? 'Your account is verified for voting rights and travel tournament roster selection.'
                          : 'No payment is required for this account status.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400 dark:border-amber-700 flex items-center gap-3 text-amber-950 dark:text-amber-100">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-700 dark:text-amber-400" />
                    <div>
                      <p className="font-title font-black text-sm">
                        Membership Dues Payment Required ({selectedItem.amountFormatted})
                      </p>
                      <p className="text-xs font-semibold opacity-95">
                        Please choose a payment method below to complete your registration.
                      </p>
                    </div>
                  </div>
                )
              ) : selectedItem.statusType === 'paid' ? (
                <div className="p-4 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-700 flex items-center gap-3 text-emerald-950 dark:text-emerald-100">
                  <Check className="w-5 h-5 flex-shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <div>
                    <p className="font-title font-black text-sm">
                      Payment Verified & Completed ({selectedItem.amountFormatted})
                    </p>
                    <p className="text-xs font-semibold opacity-95">
                      Your transaction has been recorded on the society roster.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400 dark:border-amber-700 flex items-center gap-3 text-amber-950 dark:text-amber-100">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-700 dark:text-amber-400" />
                  <div>
                    <p className="font-title font-black text-sm">
                      {selectedItem.title} Payment Required ({selectedItem.amountFormatted})
                    </p>
                    <p className="text-xs font-semibold opacity-95">
                      Please select an authorized payment option below to finalize registration.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Method Action Buttons (Filtered by allowed-payments in Firestore document) */}
              {selectedItem.statusType === 'unpaid' && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-black text-[#0075A2] dark:text-[#53afd0] uppercase tracking-wider block">
                    Choose Payment Option
                  </span>

                  <div className="payment-actions-container">
                    {/* Action Button 1: Stripe Card */}
                    {selectedItem.allowedPayments.includes('stripe') && (
                      <button
                        type="button"
                        onClick={() => setIsStripeModalOpen(true)}
                        className="payment-action-btn"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center flex-shrink-0 card-swipe-icon-box shadow-xs">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <span className="payment-action-title">
                              Credit / Debit Card
                            </span>
                            <span className="payment-action-desc">
                              Visa, Mastercard, Apple Pay, Google Pay via Stripe
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 btn-action-arrow flex-shrink-0" />
                      </button>
                    )}

                    {/* Action Button 2: PayPal */}
                    {selectedItem.allowedPayments.includes('paypal') && (
                      <button
                        type="button"
                        onClick={() => setIsPayPalModalOpen(true)}
                        className="payment-action-btn"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-title font-black text-lg flex-shrink-0 paypal-pulse-icon-box shadow-xs">
                            🅿️
                          </div>
                          <div className="text-left">
                            <span className="payment-action-title">
                              PayPal Account
                            </span>
                            <span className="payment-action-desc">
                              PayPal Balance, Linked Bank Account, PayLater
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 btn-action-arrow flex-shrink-0" />
                      </button>
                    )}

                    {/* Action Button 3: Interac e-Transfer */}
                    {selectedItem.allowedPayments.includes('etransfer') && (
                      <button
                        type="button"
                        onClick={() => setIsInteracModalOpen(true)}
                        className="payment-action-btn"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 bank-lift-icon-box shadow-xs">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <span className="payment-action-title">
                              Interac e-Transfer
                            </span>
                            <span className="payment-action-desc">
                              Direct Bank Transfer to finance@ucds.ca
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 btn-action-arrow flex-shrink-0" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions: "I've Graduated!" (UCDS Non-Alumni Only) & "Sign Out" */}
        <div className="w-full flex flex-wrap items-center justify-center gap-4 pt-4 pb-8">
          {profile.isUCDS && !isAlumni && (
            <button
              type="button"
              onClick={() => {
                setGradStep(0);
                setIsGradModalOpen(true);
              }}
              className="btn-bulk-toggle py-3 px-6 text-sm font-extrabold flex items-center gap-2 border-[#0075A2] text-[#0075A2] dark:text-[#53afd0]"
            >
              <GraduationCap className="w-4 h-4" />
              <span>I've Graduated!</span>
            </button>
          )}

          <button
            type="button"
            className="btn-form-back py-3 px-8 text-sm font-extrabold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 shadow-sm"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>

      {/* POPUP 1: STRIPE CHECKOUT MODAL */}
      {isStripeModalOpen && (
        <div className="modal-org-overlay" onClick={() => setIsStripeModalOpen(false)}>
          <div
            className="modal-org-content max-w-lg p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0075A2]/10 dark:bg-[#53afd0]/20 text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="modal-header-title">
                    Stripe Card Checkout
                  </h3>
                  <p className="modal-header-subtitle">
                    256-Bit SSL Encrypted Payment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStripeModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Summary Card */}
            <div className="modal-inner-card flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] block">
                  {selectedItem.category}
                </span>
                <h4 className="font-title font-black text-sm text-[#101426] dark:text-[#F6F6F6]">
                  {selectedItem.title}
                </h4>
              </div>
              <span className="font-title font-black text-xl text-[#0075A2] dark:text-[#53afd0]">
                {selectedItem.amountFormatted}
              </span>
            </div>

            <div className="space-y-3">
              <p className="modal-body-text">
                You will be redirected to the official Stripe hosted checkout. Your payment will be verified instantly upon completion and your membership status will update in real-time.
              </p>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Supports Visa, Mastercard, American Express, Apple Pay, Google Pay</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                className="btn-form-back py-2.5 px-5 text-xs font-bold"
                onClick={() => setIsStripeModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  redirectToStripeCheckout({
                    userId: user?.uid || '',
                    userEmail: profile['email-preferred'] || user?.email || '',
                    userName: profile.username || '',
                    priceAmountCents: selectedItem.amountCents,
                  });
                }}
                className="btn-form-next py-2.5 px-6 text-xs font-black flex items-center gap-2 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Proceed to Stripe</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: PAYPAL CHECKOUT MODAL */}
      {isPayPalModalOpen && (
        <div className="modal-org-overlay" onClick={() => setIsPayPalModalOpen(false)}>
          <div
            className="modal-org-content max-w-lg p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-title font-black text-xl">
                  🅿️
                </div>
                <div>
                  <h3 className="modal-header-title">
                    PayPal Checkout
                  </h3>
                  <p className="modal-header-subtitle">
                    Instant Verification via PayPal
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPayPalModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Summary Card */}
            <div className="modal-inner-card flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] block">
                  {selectedItem.category}
                </span>
                <h4 className="font-title font-black text-sm text-[#101426] dark:text-[#F6F6F6]">
                  {selectedItem.title}
                </h4>
              </div>
              <span className="font-title font-black text-xl text-[#0075A2] dark:text-[#53afd0]">
                {selectedItem.amountFormatted}
              </span>
            </div>

            <p className="modal-body-text">
              Click the PayPal button below to sign in and authorize payment with your PayPal balance or linked bank account.
            </p>

            {/* Live PayPal Smart Button */}
            <div className="w-full pt-1">
              <PayPalButton
                orderDetails={{
                  userId: user?.uid || '',
                  userEmail: profile['email-preferred'] || user?.email || '',
                  userName: profile.username || '',
                  itemId: selectedItem.id,
                  itemTitle: selectedItem.title,
                  amountCad: selectedItem.amountCents / 100,
                }}
                onSuccess={async (orderId) => {
                  if (profile) {
                    if (selectedItem.isMembershipDues) {
                      setProfile({ ...profile, isPaid: true });
                    }
                    const targetEmail = profile['email-preferred'] || user?.email || '';
                    await loadUserPayments(profile, targetEmail);
                  }
                  setIsPayPalModalOpen(false);
                  setSuccess(`Payment verified! Order #${orderId} completed successfully.`);
                }}
                onError={(err) => setError(err)}
              />
            </div>
          </div>
        </div>
      )}

      {/* POPUP 3: INTERAC E-TRANSFER MODAL (With Copy Email Buttons) */}
      {isInteracModalOpen && (
        <div className="modal-org-overlay" onClick={() => setIsInteracModalOpen(false)}>
          <div
            className="modal-org-content max-w-lg p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="modal-header-title">
                    Interac e-Transfer Instructions
                  </h3>
                  <p className="modal-header-subtitle">
                    Canadian Bank Transfer & Auto-Matching
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInteracModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Transfer Destination & Copy Button */}
            <div className="modal-inner-card space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#0075A2] dark:text-[#53afd0] block">
                1. Recipient Details
              </span>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-black text-sm text-[#101426] dark:text-[#F6F6F6]">
                    finance@ucds.ca
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    TD Bank Autodeposit (No security question needed)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('finance@ucds.ca', 'recipient')}
                  className={`btn-copy-chip ${copiedRecipient ? 'copied' : ''}`}
                >
                  {copiedRecipient ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 2: Critical Required Memo Box & Copy Button */}
            <div className="modal-amber-warning space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                <span className="font-black text-xs uppercase tracking-wide text-amber-950 dark:text-amber-200">
                  2. Mandatory Transfer Memo
                </span>
              </div>

              <p className="text-xs font-bold text-amber-950 dark:text-amber-200 leading-snug">
                You MUST copy and paste your exact login email into the e-Transfer memo/message field so our automated verification script can match your payment:
              </p>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-amber-300 dark:border-amber-700">
                <code className="font-mono font-black text-xs text-[#101426] dark:text-[#F6F6F6] truncate select-all">
                  {memberLoginEmail}
                </code>

                <button
                  type="button"
                  onClick={() => copyToClipboard(memberLoginEmail, 'memo')}
                  className={`btn-copy-chip ${copiedMemo ? 'copied' : ''}`}
                >
                  {copiedMemo ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Memo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="modal-body-text italic">
              *Incoming TD Bank autodeposit notifications are parsed automatically every 15-30 minutes. Once matched, your account will display as Paid immediately.
            </p>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                className="btn-form-next py-2.5 px-6 text-xs font-black"
                onClick={() => setIsInteracModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Selection Modal (Alumni Strictly Excluded) */}
      {isRolesModalOpen && (
        <div className="modal-org-overlay" onClick={() => setIsRolesModalOpen(false)}>
          <div className="modal-org-content max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-header-title mb-2">
              Select Participation Roles
            </h3>
            <p className="modal-body-text mb-4">
              Choose all the roles and activities that describe your involvement:
            </p>

            <div className="tiles-grid mb-6">
              {stockRolesOptions.map((role) => {
                const isSelected = roles.includes(role);
                return (
                  <div
                    key={role}
                    className={`select-tile capitalize ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (isSelected) {
                        setRoles(roles.filter((r) => r !== role));
                      } else {
                        setRoles([...roles, role]);
                      }
                    }}
                  >
                    <span className="text-[#101426] dark:text-[#F6F6F6] font-bold">{role}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-form-next text-sm py-2 px-5"
                onClick={() => setIsRolesModalOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graduation Confirmation Popup Modal (High-Contrast Light and Dark Mode) */}
      {isGradModalOpen && (
        <div className="modal-org-overlay" onClick={() => setIsGradModalOpen(false)}>
          <div
            className="modal-org-content max-w-lg p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="modal-header-title">
                    Graduation Confirmation
                  </h3>
                  <p className="modal-header-subtitle">
                    Alumnus Status Verification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGradModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt Warning Message as requested */}
            <div className="modal-amber-warning shadow-xs">
              Congrats! Clicking this button will make you an Alumnus, are you sure you want to do that? This will be a headache for execs if you're lying &gt;:(
            </div>

            {/* Step Explanation & Notice */}
            <p className="modal-body-text font-bold">
              Becoming an Alumnus grants you lifetime dues exemption, moves you to the alumni directory, and waives UCalgary voting requirements.
            </p>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                className="btn-form-back w-full sm:w-auto py-2.5 px-5 text-xs font-bold"
                onClick={() => {
                  setIsGradModalOpen(false);
                  setGradStep(0);
                }}
              >
                Cancel
              </button>

              {/* Progressive Confirmation Button: "I'm Sure" -> "I'm Really Sure" -> "Graduate me already!" */}
              <button
                type="button"
                disabled={isGraduating}
                onClick={handleGraduationStep}
                className={`btn-grad-confirm w-full sm:w-auto py-2.5 px-6 text-xs font-black rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${gradStep === 0
                    ? 'bg-[#0075A2] text-white hover:bg-[#1C244C]'
                    : gradStep === 1
                      ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-md'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg animate-pulse'
                  }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>{isGraduating ? 'Graduating...' : getGradButtonText()}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
