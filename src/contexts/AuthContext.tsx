import React, { createContext, useEffect, useState, useCallback } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { subscribeUserProfile, getUserProfile, type UserProfile } from '@/services/userService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isExecutive: boolean;
  isPaid: boolean;
  isRestricted: boolean;
  isUCDS: boolean;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  authError: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isConfigured = isFirebaseConfigured();

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!auth || !isConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);

        // Cancel previous profile subscription if any
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (currentUser) {
          // Real-time live subscription to current user's profile document in Firestore
          unsubscribeProfile = subscribeUserProfile(currentUser.uid, (liveProfile) => {
            setProfile(liveProfile);
            setLoading(false);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [isConfigured]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    try {
      const fresh = await getUserProfile(user.uid, true);
      setProfile(fresh);
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, [user]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    if (!auth || !googleProvider || !isConfigured) {
      setAuthError(
        'Firebase Authentication is not configured yet. Add your API keys to .env.local to enable live sign in.'
      );
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setAuthError(message);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    if (!auth || !isConfigured) {
      setAuthError(
        'Firebase Authentication is not configured yet. Add your API keys to .env.local to enable live sign in.'
      );
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setAuthError(message);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    if (!auth || !isConfigured) {
      setAuthError(
        'Firebase Authentication is not configured yet. Add your API keys to .env.local to enable live registration.'
      );
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setAuthError(message);
      throw err;
    }
  };

  const logout = async () => {
    setAuthError(null);
    if (!auth || !isConfigured) {
      setUser(null);
      setProfile(null);
      return;
    }
    try {
      await signOut(auth);
      setProfile(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log out';
      setAuthError(message);
      throw err;
    }
  };

  const clearError = () => setAuthError(null);

  const isExecutive = Boolean(profile?.isExecutive);
  const isPaid = Boolean(profile?.isPaid);
  const isRestricted = Boolean(profile?.isRestricted);
  const isUCDS = Boolean(profile?.isUCDS);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isExecutive,
        isPaid,
        isRestricted,
        isUCDS,
        loading,
        isConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        refreshProfile,
        authError,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
