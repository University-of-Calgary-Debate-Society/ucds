import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserPronouns {
  object: string;
  subject: string;
}

export interface UserProfile {
  'name-first': string;
  'name-last': string;
  'email-login': string;
  'email-preferred': string;
  'email-ucalgary'?: string;
  username: string;
  pronouns: UserPronouns;
  phone: string;
  ucid?: string;
  program?: string;
  year?: string;
  type: string[];
  'affiliated-organization'?: string;
  isPaid: boolean;
  isExecutive: boolean;
  isRegistered: boolean;
  isUCDS: boolean;
  isRestricted: boolean;
  'time-created'?: unknown;
  'time-updated'?: unknown;
}

export interface SubscriberDoc {
  email: string;
  'name-first': string;
  'name-last': string;
  lists: string[];
  isUser: boolean;
  'time-created'?: unknown;
  'time-updated'?: unknown;
}

export interface OrganizationDoc {
  id: string;
  name: string;
  'name-abbreviation'?: string;
  'name-abbreviated'?: string;
  'name-affiliated'?: string;
  'name-aliases'?: string[];
  location?: {
    country?: string;
    city?: string;
    province?: string;
    address?: string;
    postcode?: string;
    cusidregion?: string;
  };
  email?: string;
  type?: string[];
  formats?: string[];
  links?: Record<string, string>;
  executives?: Record<string, { 'name-first'?: string; 'name-last'?: string; email?: string }>;
}

export const PUBLIC_MAILING_LISTS = [
  'General',
  'Newsletter',
  'UCDS Events',
  'Opportunities',
  'Blog',
  'Highschool Debate',
] as const;

/**
 * Initialize a bare user document upon first authentication.
 * Flagged with isRegistered = false until the onboarding form is completed.
 */
export async function initUserDocument(
  uid: string,
  loginEmail: string,
  preferredEmail?: string
): Promise<UserProfile> {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const userDocRef = doc(db, 'Users', uid);
  const existing = await getDoc(userDocRef);

  if (existing.exists()) {
    return existing.data() as UserProfile;
  }

  const initialProfile: UserProfile = {
    'name-first': '',
    'name-last': '',
    'email-login': loginEmail || '',
    'email-preferred': preferredEmail || loginEmail || '',
    'email-ucalgary': '',
    username: '',
    pronouns: { object: '', subject: '' },
    phone: '',
    ucid: '',
    program: '',
    year: '',
    type: [],
    'affiliated-organization': '',
    isPaid: false,
    isExecutive: false,
    isRegistered: false,
    isUCDS: false,
    isRestricted: false,
    'time-created': serverTimestamp(),
    'time-updated': serverTimestamp(),
  };

  await setDoc(userDocRef, initialProfile, { merge: true });
  return initialProfile;
}

/**
 * Fetch user profile from Firestore by Auth UID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  const userDocRef = doc(db, 'Users', uid);
  const snapshot = await getDoc(userDocRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserProfile;
}

/**
 * Check if a username is available via dedicated Usernames index.
 * This avoids exposing Users collection PII to client-side enumeration.
 */
export async function isUsernameAvailable(username: string, currentUid?: string): Promise<boolean> {
  if (!db || !username) return false;
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) return false;

  try {
    // 1. Check dedicated Usernames document
    const usernameDocRef = doc(db, 'Usernames', cleanUsername);
    const snap = await getDoc(usernameDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (currentUid && data.uid === currentUid) {
        return true;
      }
      return false;
    }

    // 2. Fallback query on Users collection
    const usersRef = collection(db, 'Users');
    const q = query(usersRef, where('username', '==', cleanUsername));
    const querySnap = await getDocs(q);

    if (querySnap.empty) {
      return true;
    }

    if (currentUid && querySnap.size === 1 && querySnap.docs[0].id === currentUid) {
      return true;
    }

    return false;
  } catch {
    // In case of restricted rules, return true if username check succeeds
    return true;
  }
}

/**
 * Update user document in Firestore and reserve username in Usernames index.
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const userDocRef = doc(db, 'Users', uid);
  await updateDoc(userDocRef, {
    ...data,
    'time-updated': serverTimestamp(),
  });

  // If username is being set or updated, reserve in Usernames collection
  if (data.username) {
    const cleanUsername = data.username.trim().toLowerCase();
    const usernameDocRef = doc(db, 'Usernames', cleanUsername);
    await setDoc(
      usernameDocRef,
      { uid, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  }
}

/**
 * Delete a user's Firestore document, username reservation, and associated subscriber entry.
 */
export async function deleteUserAccount(
  uid: string,
  preferredEmail?: string,
  username?: string
): Promise<void> {
  if (!db) return;
  const userDocRef = doc(db, 'Users', uid);
  await deleteDoc(userDocRef);

  if (username) {
    const cleanUsername = username.trim().toLowerCase();
    const usernameDocRef = doc(db, 'Usernames', cleanUsername);
    await deleteDoc(usernameDocRef).catch(() => {});
  }

  if (preferredEmail) {
    const subscriberRef = doc(db, 'Subscribers', preferredEmail.trim().toLowerCase());
    await deleteDoc(subscriberRef).catch(() => {});
  }
}

/**
 * Fetch debate organizations directory, strictly excluding _default.
 */
export async function getOrganizations(): Promise<OrganizationDoc[]> {
  if (!db) return [];
  const orgsRef = collection(db, 'Organizations');
  const snap = await getDocs(orgsRef);

  const orgs: OrganizationDoc[] = [];
  snap.forEach((docSnap) => {
    if (docSnap.id !== '_default') {
      orgs.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<OrganizationDoc, 'id'>),
      });
    }
  });

  return orgs;
}

/**
 * Synchronize mailing list subscriptions for an email.
 * If lists are empty, removes the document from Subscribers collection to save space.
 */
export async function syncSubscriberDoc(
  email: string,
  firstName: string,
  lastName: string,
  lists: string[],
  isUser: boolean
): Promise<void> {
  if (!db) return;
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return;

  const subscriberRef = doc(db, 'Subscribers', cleanEmail);

  if (lists.length === 0) {
    await deleteDoc(subscriberRef).catch(() => {});
    return;
  }

  const existing = await getDoc(subscriberRef);
  if (existing.exists()) {
    await updateDoc(subscriberRef, {
      'name-first': firstName || existing.data()['name-first'] || '',
      'name-last': lastName || existing.data()['name-last'] || '',
      lists,
      isUser,
      'time-updated': serverTimestamp(),
    });
  } else {
    await setDoc(subscriberRef, {
      email: cleanEmail,
      'name-first': firstName || '',
      'name-last': lastName || '',
      lists,
      isUser,
      'time-created': serverTimestamp(),
      'time-updated': serverTimestamp(),
    });
  }
}

/**
 * Fetch a subscriber's current subscription record.
 */
export async function getSubscriber(email: string): Promise<SubscriberDoc | null> {
  if (!db || !email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const subscriberRef = doc(db, 'Subscribers', cleanEmail);
  const snap = await getDoc(subscriberRef);
  if (!snap.exists()) return null;
  return snap.data() as SubscriberDoc;
}

/**
 * Update or unsubscribe from mailing lists.
 */
export async function updateSubscriberLists(email: string, lists: string[]): Promise<void> {
  if (!db || !email) return;
  const cleanEmail = email.trim().toLowerCase();
  const subscriberRef = doc(db, 'Subscribers', cleanEmail);

  if (lists.length === 0) {
    await deleteDoc(subscriberRef).catch(() => {});
    return;
  }

  const snap = await getDoc(subscriberRef);
  if (snap.exists()) {
    await updateDoc(subscriberRef, {
      lists,
      'time-updated': serverTimestamp(),
    });
  } else {
    await setDoc(subscriberRef, {
      email: cleanEmail,
      'name-first': '',
      'name-last': '',
      lists,
      isUser: false,
      'time-created': serverTimestamp(),
      'time-updated': serverTimestamp(),
    });
  }
}
