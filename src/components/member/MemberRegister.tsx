import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  Globe,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  HelpCircle,
  Building,
  Check,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MultiStepForm, type FormStepDefinition } from './MultiStepForm';
import { OrganizationPickerModal } from './OrganizationPickerModal';
import { FloatingAlert } from './FloatingAlert';
import {
  getUserProfile,
  initUserDocument,
  isUsernameAvailable,
  updateUserProfile,
  syncSubscriberDoc,
  PUBLIC_MAILING_LISTS,
} from '@/services/userService';
import { auth } from '@/lib/firebase';

type StudentCategory = 'ucalgary' | 'external';
type UCalgaryStatus = 'current' | 'alumnus';

export const MemberRegister: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle, signUpWithEmail } = useAuth();

  // Auth creation state (Step 0 if not logged in)
  const [authMethod, setAuthMethod] = useState<'options' | 'email'>('options');
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Category choice
  const [category, setCategory] = useState<StudentCategory | null>(null);

  // Form State - Common
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [commEmail, setCommEmail] = useState('');
  const [hasCustomCommEmail, setHasCustomCommEmail] = useState(false);
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [pronounOption, setPronounOption] = useState<string>('He/Him');
  const [customSubject, setCustomSubject] = useState('');
  const [customObject, setCustomObject] = useState('');

  // Form State - Path A (UCalgary)
  const [ucalgaryStatus, setUcalgaryStatus] = useState<UCalgaryStatus>('current');
  const [ucid, setUcid] = useState('');
  const [ucalgaryEmail, setUcalgaryEmail] = useState('');
  const [program, setProgram] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [preferNotToSayYear, setPreferNotToSayYear] = useState(false);
  const [ucalgaryRoles, setUcalgaryRoles] = useState<string[]>(['debate']);

  // Form State - Path B (External)
  const [externalRoles, setExternalRoles] = useState<string[]>(['debater']);
  const [affiliatedOrg, setAffiliatedOrg] = useState('');
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  // Form State - Mailing Lists (Step 3)
  const [mailingLists, setMailingLists] = useState<string[]>(['General', 'Newsletter']);

  // Validation feedback & field-level highlight states
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-field error (red) and warning (yellow) states
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, boolean>>({});

  const clearFieldError = (fieldKey: string) => {
    if (fieldErrors[fieldKey]) {
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: false }));
    }
    if (fieldWarnings[fieldKey]) {
      setFieldWarnings((prev) => ({ ...prev, [fieldKey]: false }));
    }
    setError(null);
  };

  // Sync auth state and initialize profile if user is already logged in
  useEffect(() => {
    if (!user) return;

    getUserProfile(user.uid)
      .then((profile) => {
        if (profile?.isRegistered) {
          navigate('/member/portal', { replace: true });
          return;
        }

        if (profile) {
          if (profile['name-first']) setFirstName(profile['name-first']);
          if (profile['name-last']) setLastName(profile['name-last']);
          if (profile.username) setUsername(profile.username);
          if (profile['email-preferred']) {
            setCommEmail(profile['email-preferred']);
            if (profile['email-preferred'] !== user.email) {
              setHasCustomCommEmail(true);
            }
          } else if (user.email) {
            setCommEmail(user.email);
          }
        } else if (user.email) {
          setCommEmail(user.email);
        }
      })
      .catch((err) => console.error('Error fetching user profile:', err));
  }, [user, navigate]);

  // Handle Google Auth Signup
  const handleGoogleSignup = async () => {
    setError(null);
    setIsAuthSubmitting(true);
    try {
      await signInWithGoogle();
      if (auth?.currentUser) {
        await initUserDocument(
          auth.currentUser.uid,
          auth.currentUser.email || '',
          auth.currentUser.email || ''
        );
        if (auth.currentUser.email) {
          setCommEmail(auth.currentUser.email);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign up failed.';
      setError(msg);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // Handle Email & Password Signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = loginEmail.trim();
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      await signUpWithEmail(cleanEmail, password);
      if (auth?.currentUser) {
        await initUserDocument(auth.currentUser.uid, cleanEmail, cleanEmail);
        setCommEmail(cleanEmail);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Please log in.');
      } else {
        setError(msg);
      }
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // Step Definitions for MultiStepForm
  const ucalgarySteps: FormStepDefinition[] = [
    {
      id: 'personal',
      title: 'Personal Details',
      shortLabel: 'Personal Info',
      description: 'Tell us a bit about yourself and your University of Calgary connection.',
    },
    {
      id: 'roles',
      title: 'Involvement & Academics',
      shortLabel: 'Year & Roles',
      description: 'Select what you are interested in doing at UCDS and your degree program.',
    },
    {
      id: 'mail',
      title: 'Mailing Lists',
      shortLabel: 'Mail Updates',
      description: 'Choose which public announcement lists you would like to be subscribed to.',
    },
  ];

  const externalSteps: FormStepDefinition[] = [
    {
      id: 'personal',
      title: 'Personal Details',
      shortLabel: 'Personal Info',
      description: 'Provide your contact details for debate tournament coordination.',
    },
    {
      id: 'roles',
      title: 'Debate Affiliation & Roles',
      shortLabel: 'Affiliation & Roles',
      description: 'Select your debate roles and affiliated institution or club.',
    },
    {
      id: 'mail',
      title: 'Mailing Lists',
      shortLabel: 'Mail Updates',
      description: 'Stay updated on public tournaments, adjudication, and invitational events.',
    },
  ];

  // Validation Logic with per-field error highlighting
  const validateStep = async (stepIndex: number): Promise<boolean> => {
    setError(null);
    const newFieldErrors: Record<string, boolean> = {};
    const newFieldWarnings: Record<string, boolean> = {};

    if (category === 'ucalgary') {
      if (stepIndex === 0) {
        // First Name
        if (!firstName.trim()) {
          newFieldErrors.firstName = true;
          setFieldErrors(newFieldErrors);
          setError('First name is required.');
          return false;
        }
        if (firstName.trim().length > 16) {
          newFieldErrors.firstName = true;
          setFieldErrors(newFieldErrors);
          setError('First name cannot exceed 16 characters.');
          return false;
        }

        // Last Name
        if (!lastName.trim()) {
          newFieldErrors.lastName = true;
          setFieldErrors(newFieldErrors);
          setError('Last name is required.');
          return false;
        }
        if (lastName.trim().length > 16) {
          newFieldErrors.lastName = true;
          setFieldErrors(newFieldErrors);
          setError('Last name cannot exceed 16 characters.');
          return false;
        }

        // Username
        const cleanUser = username.trim();
        if (!cleanUser) {
          newFieldErrors.username = true;
          setFieldErrors(newFieldErrors);
          setError('Please choose a username.');
          return false;
        }
        if (cleanUser.length > 16) {
          newFieldErrors.username = true;
          setFieldErrors(newFieldErrors);
          setError('Username cannot exceed 16 characters.');
          return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(cleanUser)) {
          newFieldErrors.username = true;
          setFieldErrors(newFieldErrors);
          setError('Username can only contain letters, numbers, and underscores.');
          return false;
        }

        const isAvail = await isUsernameAvailable(cleanUser, user?.uid);
        if (!isAvail) {
          newFieldErrors.username = true;
          setFieldErrors(newFieldErrors);
          setError('This username is already taken. Please choose another one.');
          return false;
        }

        // UCID (Required for current students, strictly 8 digits)
        if (ucalgaryStatus === 'current') {
          const cleanUcid = ucid.trim();
          if (!cleanUcid || !/^\d{8}$/.test(cleanUcid)) {
            newFieldErrors.ucid = true;
            setFieldErrors(newFieldErrors);
            setError('UCID must be exactly 8 digits.');
            return false;
          }
        }

        // Preferred Communication Email
        const cleanComm = commEmail.trim();
        if (!cleanComm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanComm)) {
          newFieldErrors.commEmail = true;
          setFieldErrors(newFieldErrors);
          setError('Please provide a valid communication email address.');
          return false;
        }

        // UCalgary Email Validation
        if (ucalgaryStatus === 'current') {
          const cleanUofC = ucalgaryEmail.trim().toLowerCase();
          if (!cleanUofC) {
            newFieldErrors.ucalgaryEmail = true;
            setFieldErrors(newFieldErrors);
            setError('University of Calgary email is required for current students.');
            return false;
          }
          if (!cleanUofC.endsWith('@ucalgary.ca')) {
            newFieldErrors.ucalgaryEmail = true;
            setFieldErrors(newFieldErrors);
            setError('UCalgary email must end with @ucalgary.ca.');
            return false;
          }

          // Format check: firstname.lastname[0-9]*@ucalgary.ca
          const ucalgaryPattern = /^[a-z]+\.[a-z]+[0-9]*@ucalgary\.ca$/;
          if (!ucalgaryPattern.test(cleanUofC) && !warningAcknowledged) {
            newFieldWarnings.ucalgaryEmail = true;
            setFieldWarnings(newFieldWarnings);
            setWarning("Are you sure that email is correct? UCalgary emails usually follow firstname.lastname@ucalgary.ca.");
            setWarningAcknowledged(true);
            return false; // Clicking Next again will proceed
          }
        }

        // Phone validation (optional, strictly 10 digits)
        if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
          newFieldErrors.phone = true;
          setFieldErrors(newFieldErrors);
          setError('Phone number must be exactly 10 digits.');
          return false;
        }

        setFieldErrors({});
        setFieldWarnings({});
        setWarning(null);
        setWarningAcknowledged(false);
        return true;
      }

      if (stepIndex === 1) {
        // Step 2: Year and Roles validation
        if (ucalgaryRoles.length === 0) {
          newFieldErrors.roles = true;
          setFieldErrors(newFieldErrors);
          setError('Please select at least one role/involvement interest.');
          return false;
        }

        if (ucalgaryStatus === 'current') {
          if (!program.trim()) {
            newFieldErrors.program = true;
            setFieldErrors(newFieldErrors);
            setError('Please enter your University program/major.');
            return false;
          }
          if (program.trim().length > 32) {
            newFieldErrors.program = true;
            setFieldErrors(newFieldErrors);
            setError('Program name cannot exceed 32 characters.');
            return false;
          }
          if (!/^[a-zA-Z0-9\s]+$/.test(program.trim())) {
            newFieldErrors.program = true;
            setFieldErrors(newFieldErrors);
            setError('Program name cannot contain symbols.');
            return false;
          }

          if (!preferNotToSayYear) {
            if (!yearOfStudy.trim() || !/^\d{1,2}$/.test(yearOfStudy.trim())) {
              newFieldErrors.year = true;
              setFieldErrors(newFieldErrors);
              setError('Please enter your year of study (1-99) or select "Prefer not to say".');
              return false;
            }
          }
        }

        setFieldErrors({});
        return true;
      }
    } else {
      // Path B: External
      if (stepIndex === 0) {
        if (!firstName.trim()) {
          newFieldErrors.firstName = true;
          setFieldErrors(newFieldErrors);
          setError('First name is required.');
          return false;
        }
        if (!lastName.trim()) {
          newFieldErrors.lastName = true;
          setFieldErrors(newFieldErrors);
          setError('Last name is required.');
          return false;
        }
        const cleanComm = commEmail.trim();
        if (!cleanComm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanComm)) {
          newFieldErrors.commEmail = true;
          setFieldErrors(newFieldErrors);
          setError('Please provide a valid communication email address.');
          return false;
        }
        if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
          newFieldErrors.phone = true;
          setFieldErrors(newFieldErrors);
          setError('Phone number must be exactly 10 digits.');
          return false;
        }
        setFieldErrors({});
        return true;
      }

      if (stepIndex === 1) {
        if (externalRoles.length === 0) {
          newFieldErrors.roles = true;
          setFieldErrors(newFieldErrors);
          setError('Please select at least one role.');
          return false;
        }
        setFieldErrors({});
        return true;
      }
    }

    setFieldErrors({});
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStepIndex);
    if (isValid) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setWarning(null);
    setWarningAcknowledged(false);
    setFieldErrors({});
    setFieldWarnings({});
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  // Submit Final Registration
  const handleSubmitRegistration = async () => {
    if (!user) {
      setError('Authentication session expired. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Resolve pronouns
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

      if (category === 'ucalgary') {
        // Map roles
        const roleMapping: Record<string, string> = {
          Alumnus: 'alumni',
          Debate: 'debater',
          Judge: 'judge',
          'Hangout and Socialize': 'general',
          Watch: 'spectator',
          Volunteer: 'volunteer',
        };

        const mappedRoles = ucalgaryRoles.map((r) => roleMapping[r] || r.toLowerCase());

        await updateUserProfile(user.uid, {
          'name-first': firstName.trim(),
          'name-last': lastName.trim(),
          username: username.trim().toLowerCase(),
          'email-preferred': commEmail.trim().toLowerCase(),
          'email-ucalgary': ucalgaryStatus === 'current' ? ucalgaryEmail.trim().toLowerCase() : '',
          pronouns: pronounsObj,
          phone: phone.trim(),
          ucid: ucalgaryStatus === 'current' ? ucid.trim() : '',
          program: ucalgaryStatus === 'current' ? program.trim() : '',
          year: ucalgaryStatus === 'current' ? (preferNotToSayYear ? 'Prefer not to say' : yearOfStudy.trim()) : '',
          type: mappedRoles,
          'affiliated-organization': 'University of Calgary Debate Society',
          isPaid: false,
          isRegistered: true,
          isUCDS: true,
        });
      } else {
        await updateUserProfile(user.uid, {
          'name-first': firstName.trim(),
          'name-last': lastName.trim(),
          'email-preferred': commEmail.trim().toLowerCase(),
          pronouns: pronounsObj,
          phone: phone.trim(),
          type: externalRoles,
          'affiliated-organization': affiliatedOrg.trim() || 'Independent',
          isPaid: false,
          isRegistered: true,
          isUCDS: false,
        });
      }

      // Sync Subscribers Collection
      await syncSubscriberDoc(
        commEmail.trim().toLowerCase(),
        firstName.trim(),
        lastName.trim(),
        mailingLists,
        true
      );

      navigate('/member/portal', { replace: true });
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to complete registration.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 0: Not Authenticated Yet
  if (!user) {
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
          <div className="text-center mb-6">
            <h1 className="member-card-title">Create an Account</h1>
            <p className="member-card-subtitle">
              Join the University of Calgary Debate Society. Register with Google or with your email.
            </p>
          </div>

          {authMethod === 'options' ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isAuthSubmitting}
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
                <span>Register with Google</span>
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.2)]" />
                <span className="flex-shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  or
                </span>
                <div className="flex-grow border-t border-[rgba(28,36,76,0.15)] dark:border-[rgba(83,175,208,0.2)]" />
              </div>

              <button
                type="button"
                onClick={() => setAuthMethod('email')}
                className="btn-register-email-alt w-full"
              >
                <Mail className="w-5 h-5 text-[#0075A2] dark:text-[#53afd0]" />
                <span>Register with Email & Password</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-login-email">
                  <Mail className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                  <span>Email Address</span>
                </label>
                <input
                  id="reg-login-email"
                  type="email"
                  required
                  placeholder="you@ucalgary.ca"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="form-input"
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">
                  <Lock className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                  <span>Create Password</span>
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm-password">
                  <Lock className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                  <span>Confirm Password</span>
                </label>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  className="btn-form-back flex-1 justify-center"
                  onClick={() => setAuthMethod('options')}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isAuthSubmitting}
                  className="btn-form-next flex-1 justify-center"
                >
                  {isAuthSubmitting ? 'Creating...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-5 border-t border-[rgba(28,36,76,0.12)] dark:border-[rgba(83,175,208,0.18)] text-center text-sm">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Already have an account?{' '}
            </span>
            <Link
              to="/member/login"
              className="font-bold text-[#0075A2] dark:text-[#53afd0] hover:underline"
            >
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Phase 1: Student Category Choice (UCalgary vs External) - Crisp Light Mode Design
  if (!category) {
    return (
      <div className="member-page-container">
        <div className="member-card max-w-xl text-center">
          <h1 className="member-card-title">Welcome to UCDS</h1>
          <p className="member-card-subtitle mb-6">
            Please choose your membership category to customize your registration process.
          </p>

          <div className="category-choice-grid">
            <div
              className="category-card"
              onClick={() => setCategory('ucalgary')}
            >
              <div className="w-14 h-14 rounded-2xl bg-[rgba(0,117,162,0.12)] dark:bg-[rgba(83,175,208,0.18)] text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center mb-3">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h3 className="category-card-title">
                UCalgary Student / Alumni
              </h3>
              <p className="category-card-desc">
                Currently attending or graduated from the University of Calgary.
              </p>
            </div>

            <div
              className="category-card"
              onClick={() => setCategory('external')}
            >
              <div className="w-14 h-14 rounded-2xl bg-[rgba(0,117,162,0.12)] dark:bg-[rgba(83,175,208,0.18)] text-[#0075A2] dark:text-[#53afd0] flex items-center justify-center mb-3">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="category-card-title">
                External Member / Adjudicator
              </h3>
              <p className="category-card-desc">
                Debaters, judges, coaches, and members from other institutions or high schools.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2: Dynamic Multi-Step Form Execution
  const currentSteps = category === 'ucalgary' ? ucalgarySteps : externalSteps;

  return (
    <div className="member-page-container">
      <div className="member-card">
        <MultiStepForm
          steps={currentSteps}
          currentStepIndex={currentStepIndex}
          onNext={handleNext}
          onBack={handleBack}
          onSubmit={handleSubmitRegistration}
          isSubmitting={isSubmitting}
          error={error}
          warning={warning}
          onClearError={() => {
            setError(null);
            setFieldErrors({});
          }}
          onClearWarning={() => {
            setWarning(null);
            setFieldWarnings({});
          }}
        >
          {/* ========================================================================= */}
          {/* PATH A: UCALGARY STUDENTS & ALUMNI */}
          {/* ========================================================================= */}
          {category === 'ucalgary' && (
            <>
              {/* STEP 1: Personal Info */}
              {currentStepIndex === 0 && (
                <div className="space-y-4">
                  {/* Attending vs Alumnus Toggle */}
                  <div className="form-group">
                    <label className="form-label">University Connection</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className={`select-tile text-center justify-center ${ucalgaryStatus === 'current' ? 'selected' : ''}`}
                        onClick={() => {
                          setUcalgaryStatus('current');
                          setUcalgaryRoles((prev) => prev.filter((r) => r !== 'Alumnus'));
                        }}
                      >
                        <span>Current Student</span>
                      </div>
                      <div
                        className={`select-tile text-center justify-center ${ucalgaryStatus === 'alumnus' ? 'selected' : ''}`}
                        onClick={() => {
                          setUcalgaryStatus('alumnus');
                          setUcalgaryRoles((prev) => Array.from(new Set([...prev, 'Alumnus'])));
                        }}
                      >
                        <span>UCalgary Alumnus</span>
                      </div>
                    </div>
                  </div>

                  {/* First & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="first-name">
                        <User className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                        <span>First Name *</span>
                      </label>
                      <input
                        id="first-name"
                        type="text"
                        required
                        maxLength={16}
                        placeholder="Sofija"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          clearFieldError('firstName');
                        }}
                        className={`form-input ${fieldErrors.firstName ? 'has-error' : ''}`}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="last-name">
                        <span>Last Name *</span>
                      </label>
                      <input
                        id="last-name"
                        type="text"
                        required
                        maxLength={16}
                        placeholder="Trkulja"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          clearFieldError('lastName');
                        }}
                        className={`form-input ${fieldErrors.lastName ? 'has-error' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Username (unique) */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-username">
                      <span>Username * (alphanumeric and underscores)</span>
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      required
                      maxLength={16}
                      placeholder="sofija_t"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        clearFieldError('username');
                      }}
                      className={`form-input ${fieldErrors.username ? 'has-error' : ''}`}
                    />
                  </div>

                  {/* Pronouns */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="pronouns-select">
                      <span>Pronouns (Optional)</span>
                    </label>
                    <select
                      id="pronouns-select"
                      value={pronounOption}
                      onChange={(e) => setPronounOption(e.target.value)}
                      className="form-input cursor-pointer"
                    >
                      <option value="He/Him">He / Him</option>
                      <option value="She/Her">She / Her</option>
                      <option value="They/Them">They / Them</option>
                      <option value="Custom">Set custom pronouns...</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>

                    {pronounOption === 'Custom' && (
                      <div className="grid grid-cols-2 gap-3 mt-2 animate-fadeIn">
                        <input
                          type="text"
                          placeholder="Subject (e.g. ze)"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          className="form-input text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Object (e.g. zir)"
                          value={customObject}
                          onChange={(e) => setCustomObject(e.target.value)}
                          className="form-input text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* UCID (Required for current students) */}
                  {ucalgaryStatus === 'current' && (
                    <div className="form-group">
                      <div className="flex items-center justify-between">
                        <label className="form-label" htmlFor="reg-ucid">
                          <span>UCID (8 Digits) *</span>
                        </label>
                        <div
                          className="flex items-center gap-1 text-xs font-semibold text-[#0075A2] dark:text-[#53afd0] cursor-help"
                          title="The 8 digits on your uni-card. You can also find this in your University of Calgary portal at portal.my.ucalgary.ca"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Where do I find this?</span>
                        </div>
                      </div>
                      <input
                        id="reg-ucid"
                        type="text"
                        maxLength={8}
                        placeholder="30123456"
                        value={ucid}
                        onChange={(e) => {
                          setUcid(e.target.value.replace(/\D/g, ''));
                          clearFieldError('ucid');
                        }}
                        className={`form-input ${fieldErrors.ucid ? 'has-error' : ''}`}
                      />
                    </div>
                  )}

                  {/* Preferred Communication Email */}
                  <div className="form-group">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <label className="form-label mb-0" htmlFor="reg-comm-email">
                        <Mail className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                        <span>Preferred Communication Email *</span>
                      </label>

                      {user?.email && (
                        <div
                          className={`modern-toggle-switch ${hasCustomCommEmail ? 'active' : ''}`}
                          onClick={() => {
                            const nextState = !hasCustomCommEmail;
                            setHasCustomCommEmail(nextState);
                            if (!nextState && user.email) {
                              setCommEmail(user.email);
                            }
                          }}
                          role="checkbox"
                          aria-checked={hasCustomCommEmail}
                          tabIndex={0}
                        >
                          <div className="toggle-switch-track">
                            <div className="toggle-switch-thumb" />
                          </div>
                          <span className="toggle-switch-label text-xs">
                            Different email for communications
                          </span>
                        </div>
                      )}
                    </div>

                    <input
                      id="reg-comm-email"
                      type="email"
                      required
                      disabled={user?.email ? !hasCustomCommEmail : false}
                      value={commEmail}
                      onChange={(e) => {
                        setCommEmail(e.target.value);
                        clearFieldError('commEmail');
                      }}
                      className={`form-input ${!hasCustomCommEmail && user?.email ? 'form-input-disabled' : ''} ${fieldErrors.commEmail ? 'has-error' : ''}`}
                    />
                  </div>

                  {/* UCalgary Email (Current Students) */}
                  {ucalgaryStatus === 'current' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="reg-uofc-email">
                        <span>University of Calgary Email (@ucalgary.ca) *</span>
                      </label>
                      <input
                        id="reg-uofc-email"
                        type="email"
                        required
                        placeholder="first.last@ucalgary.ca"
                        value={ucalgaryEmail}
                        onChange={(e) => {
                          setUcalgaryEmail(e.target.value);
                          clearFieldError('ucalgaryEmail');
                        }}
                        className={`form-input ${fieldErrors.ucalgaryEmail ? 'has-error' : ''} ${fieldWarnings.ucalgaryEmail ? 'has-warning' : ''}`}
                      />
                    </div>
                  )}

                  {/* Phone Number (Optional, 10 Digits) */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="reg-phone">
                      <Phone className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                      <span>Phone Number (Optional - 10 digits)</span>
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      maxLength={10}
                      placeholder="4031234567"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, ''));
                        clearFieldError('phone');
                      }}
                      className={`form-input ${fieldErrors.phone ? 'has-error' : ''}`}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Year & Roles */}
              {currentStepIndex === 1 && (
                <div className="space-y-4">
                  {/* Tiled Involvement Roles */}
                  <div className="form-group">
                    <div className="flex items-center justify-between">
                      <label className="form-label">
                        <span>What are you interested in doing at UCDS? *</span>
                      </label>
                      <div className="tile-bulk-controls">
                        <button
                          type="button"
                          className="btn-bulk-toggle"
                          onClick={() => {
                            setUcalgaryRoles([
                              'Debate',
                              'Judge',
                              'Volunteer',
                              'Hangout and Socialize',
                              'Watch',
                              ...(ucalgaryStatus === 'alumnus' ? ['Alumnus'] : []),
                            ]);
                            clearFieldError('roles');
                          }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="btn-bulk-toggle"
                          onClick={() =>
                            setUcalgaryRoles(ucalgaryStatus === 'alumnus' ? ['Alumnus'] : [])
                          }
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="tiles-grid">
                      {[
                        'Debate',
                        'Judge',
                        'Volunteer',
                        'Hangout and Socialize',
                        'Watch',
                        ...(ucalgaryStatus === 'alumnus' ? ['Alumnus'] : []),
                      ].map((role) => {
                        const isSelected = ucalgaryRoles.includes(role);
                        const isLocked = role === 'Alumnus' && ucalgaryStatus === 'alumnus';

                        return (
                          <div
                            key={role}
                            className={`select-tile ${isSelected ? 'selected' : ''} ${fieldErrors.roles && ucalgaryRoles.length === 0 ? 'has-error' : ''}`}
                            onClick={() => {
                              if (isLocked) return;
                              clearFieldError('roles');
                              if (isSelected) {
                                setUcalgaryRoles(ucalgaryRoles.filter((r) => r !== role));
                              } else {
                                setUcalgaryRoles([...ucalgaryRoles, role]);
                              }
                            }}
                          >
                            <span>{role}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* University Program (Current Students) */}
                  {ucalgaryStatus === 'current' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="reg-program">
                        <span>University Program / Major * (Max 32 chars)</span>
                      </label>
                      <input
                        id="reg-program"
                        type="text"
                        required
                        maxLength={32}
                        placeholder="Computer Science, Political Science, etc."
                        value={program}
                        onChange={(e) => {
                          setProgram(e.target.value);
                          clearFieldError('program');
                        }}
                        className={`form-input ${fieldErrors.program ? 'has-error' : ''}`}
                      />
                    </div>
                  )}

                  {/* Year of Study (Current Students) */}
                  {ucalgaryStatus === 'current' && (
                    <div className="form-group">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <label className="form-label mb-0" htmlFor="reg-year">
                          <span>Year of Study *</span>
                        </label>
                        <div
                          className={`modern-toggle-switch ${preferNotToSayYear ? 'active' : ''}`}
                          onClick={() => {
                            const nextState = !preferNotToSayYear;
                            setPreferNotToSayYear(nextState);
                            clearFieldError('year');
                          }}
                          role="checkbox"
                          aria-checked={preferNotToSayYear}
                          tabIndex={0}
                        >
                          <div className="toggle-switch-track">
                            <div className="toggle-switch-thumb" />
                          </div>
                          <span className="toggle-switch-label text-xs">
                            Prefer not to say
                          </span>
                        </div>
                      </div>

                      {/* Smooth Expandable Input Container */}
                      <div className={`expandable-field-container ${preferNotToSayYear ? 'collapsed' : ''}`}>
                        <div className="expandable-field-inner pt-1">
                          <input
                            id="reg-year"
                            type="text"
                            maxLength={2}
                            placeholder="e.g. 1, 2, 3, 4..."
                            value={yearOfStudy}
                            disabled={preferNotToSayYear}
                            onChange={(e) => {
                              setYearOfStudy(e.target.value.replace(/\D/g, ''));
                              clearFieldError('year');
                            }}
                            className={`form-input ${fieldErrors.year ? 'has-error' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Mailing Lists */}
              {currentStepIndex === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Select public newsletters and announcement channels:
                    </p>
                    <div className="tile-bulk-controls">
                      <button
                        type="button"
                        className="btn-bulk-toggle"
                        onClick={() => setMailingLists([...PUBLIC_MAILING_LISTS])}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn-bulk-toggle"
                        onClick={() => setMailingLists([])}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="tiles-grid-two-col">
                    {PUBLIC_MAILING_LISTS.map((list) => {
                      const isSelected = mailingLists.includes(list);
                      return (
                        <div
                          key={list}
                          className={`select-tile ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setMailingLists(mailingLists.filter((l) => l !== list));
                            } else {
                              setMailingLists([...mailingLists, list]);
                            }
                          }}
                        >
                          <span>{list}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ========================================================================= */}
          {/* PATH B: EXTERNAL DEBATERS, JUDGES & COACHES */}
          {/* ========================================================================= */}
          {category === 'external' && (
            <>
              {/* STEP 1: Personal Info */}
              {currentStepIndex === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label" htmlFor="ext-first-name">
                        <User className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                        <span>First Name *</span>
                      </label>
                      <input
                        id="ext-first-name"
                        type="text"
                        required
                        maxLength={16}
                        placeholder="Alex"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          clearFieldError('firstName');
                        }}
                        className={`form-input ${fieldErrors.firstName ? 'has-error' : ''}`}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="ext-last-name">
                        <span>Last Name *</span>
                      </label>
                      <input
                        id="ext-last-name"
                        type="text"
                        required
                        maxLength={16}
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          clearFieldError('lastName');
                        }}
                        className={`form-input ${fieldErrors.lastName ? 'has-error' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Preferred Communication Email */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="ext-comm-email">
                      <Mail className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                      <span>Communication Email *</span>
                    </label>
                    <input
                      id="ext-comm-email"
                      type="email"
                      required
                      placeholder="alex.smith@example.com"
                      value={commEmail}
                      onChange={(e) => {
                        setCommEmail(e.target.value);
                        clearFieldError('commEmail');
                      }}
                      className={`form-input ${fieldErrors.commEmail ? 'has-error' : ''}`}
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="ext-phone">
                      <Phone className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                      <span>Phone Number (Optional - 10 digits)</span>
                    </label>
                    <input
                      id="ext-phone"
                      type="tel"
                      maxLength={10}
                      placeholder="4031234567"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, ''));
                        clearFieldError('phone');
                      }}
                      className={`form-input ${fieldErrors.phone ? 'has-error' : ''}`}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Roles & Affiliation */}
              {currentStepIndex === 1 && (
                <div className="space-y-4">
                  {/* External Roles Tiled Grid */}
                  <div className="form-group">
                    <div className="flex items-center justify-between">
                      <label className="form-label">
                        <span>Select your roles / participation *</span>
                      </label>
                      <div className="tile-bulk-controls">
                        <button
                          type="button"
                          className="btn-bulk-toggle"
                          onClick={() => {
                            setExternalRoles([
                              'independent adjudicator',
                              'debater',
                              'judge',
                              'organizational committee member',
                              'high school student',
                              'coach',
                              'junior high student',
                            ]);
                            clearFieldError('roles');
                          }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="btn-bulk-toggle"
                          onClick={() => setExternalRoles([])}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    <div className="tiles-grid">
                      {[
                        'independent adjudicator',
                        'debater',
                        'judge',
                        'organizational committee member',
                        'high school student',
                        'coach',
                        'junior high student',
                      ].map((role) => {
                        const isSelected = externalRoles.includes(role);
                        return (
                          <div
                            key={role}
                            className={`select-tile capitalize ${isSelected ? 'selected' : ''} ${fieldErrors.roles && externalRoles.length === 0 ? 'has-error' : ''}`}
                            onClick={() => {
                              clearFieldError('roles');
                              if (isSelected) {
                                setExternalRoles(externalRoles.filter((r) => r !== role));
                              } else {
                                setExternalRoles([...externalRoles, role]);
                              }
                            }}
                          >
                            <span>{role}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Organization Selector */}
                  <div className="form-group">
                    <label className="form-label">
                      <Building className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />
                      <span>Affiliated Organization (Optional)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 form-input font-bold text-sm bg-slate-50 dark:bg-slate-900/50 flex items-center">
                        {affiliatedOrg || <span className="text-slate-500 font-medium">Independent (Unaffiliated)</span>}
                      </div>
                      <button
                        type="button"
                        className="btn-bulk-toggle py-2.5 px-4 text-xs whitespace-nowrap"
                        onClick={() => setIsOrgModalOpen(true)}
                      >
                        Choose Organization
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Mailing Lists */}
              {currentStepIndex === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Select public newsletters and tournament announcement channels:
                    </p>
                    <div className="tile-bulk-controls">
                      <button
                        type="button"
                        className="btn-bulk-toggle"
                        onClick={() => setMailingLists([...PUBLIC_MAILING_LISTS])}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="btn-bulk-toggle"
                        onClick={() => setMailingLists([])}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="tiles-grid-two-col">
                    {PUBLIC_MAILING_LISTS.map((list) => {
                      const isSelected = mailingLists.includes(list);
                      return (
                        <div
                          key={list}
                          className={`select-tile ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setMailingLists(mailingLists.filter((l) => l !== list));
                            } else {
                              setMailingLists([...mailingLists, list]);
                            }
                          }}
                        >
                          <span>{list}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#0075A2] dark:text-[#53afd0]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </MultiStepForm>
      </div>

      {/* Organization Selection Popup Modal */}
      <OrganizationPickerModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        selectedOrg={affiliatedOrg}
        onSelect={(org) => setAffiliatedOrg(org)}
      />
    </div>
  );
};
