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
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clientCache } from '@/utils/clientCache';
import { fetchAllOrganizations, ORGS_CACHE_KEY, type OrganizationDoc } from './organizationService';

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
  biography?: string;
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

export type { OrganizationDoc };

export const PUBLIC_MAILING_LISTS = [
  'General',
  'Newsletter',
  'UCDS Events',
  'Opportunities',
  'Blog',
  'Highschool Debate',
] as const;

/**
 * Check if any of the provided emails match an officer in the Current UCDS Executive Roster.
 */
export async function isEmailInExecutiveRoster(
  emails: (string | undefined | null)[]
): Promise<{ isExec: boolean; role?: string; officer?: PreviousExecutiveOfficer }> {
  try {
    const cleanEmails = emails
      .filter((e): e is string => Boolean(e && e.trim()))
      .map((e) => e.trim().toLowerCase());

    if (cleanEmails.length === 0) return { isExec: false };

    const ucdsOrg = await getUcdsOrganization();
    if (!ucdsOrg || !ucdsOrg.executives) return { isExec: false };

    for (const [key, rawOfficer] of Object.entries(ucdsOrg.executives)) {
      const off = rawOfficer as PreviousExecutiveOfficer;
      const offEmail = (off.email || '').trim().toLowerCase();
      if (offEmail && cleanEmails.includes(offEmail)) {
        return { isExec: true, role: off.role || key, officer: off };
      }
    }
  } catch (err) {
    console.warn('Failed to verify email against executive roster:', err);
  }
  return { isExec: false };
}

/**
 * Initialize a new user document in Firestore upon first sign-in if not existing.
 * Automatically checks and links executive privileges if the user's email is in the Executive Roster.
 */
export async function initUserDocument(
  uid: string,
  loginEmail?: string,
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

  // Check if initial login/preferred email is listed in the executive roster
  const execCheck = await isEmailInExecutiveRoster([loginEmail, preferredEmail]);

  const initialProfile: UserProfile = {
    'name-first': execCheck.officer?.['name-first'] || '',
    'name-last': execCheck.officer?.['name-last'] || '',
    'email-login': loginEmail || '',
    'email-preferred': preferredEmail || loginEmail || '',
    'email-ucalgary': '',
    username: '',
    pronouns: { object: '', subject: '' },
    phone: '',
    ucid: '',
    program: '',
    year: '',
    type: execCheck.isExec ? ['Executive'] : [],
    'affiliated-organization': execCheck.isExec ? 'University of Calgary Debate Society' : '',
    biography: execCheck.officer?.bio || '',
    isPaid: false,
    isExecutive: execCheck.isExec,
    isRegistered: false,
    isUCDS: execCheck.isExec ? true : false,
    isRestricted: false,
    'time-created': serverTimestamp(),
    'time-updated': serverTimestamp(),
  };

  await setDoc(userDocRef, initialProfile, { merge: true });
  return initialProfile;
}

/**
 * Fetch user profile from client cache first or Firestore by Auth UID.
 * Automatically verifies and elevates isExecutive if the user is listed in the current executive team.
 */
export async function getUserProfile(uid: string, forceRefresh = false): Promise<UserProfile | null> {
  const cacheKey = `user_profile_${uid}`;
  if (!forceRefresh) {
    const cached = clientCache.get<UserProfile>(cacheKey);
    if (cached) return cached;
  }

  if (!db) return null;
  const userDocRef = doc(db, 'Users', uid);
  const snapshot = await getDoc(userDocRef);
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as UserProfile;

  // Auto-verify executive status if not already marked as executive
  if (!data.isExecutive) {
    const execCheck = await isEmailInExecutiveRoster([
      data['email-ucalgary'],
      data['email-preferred'],
      data['email-login'],
    ]);

    if (execCheck.isExec) {
      data.isExecutive = true;
      data.isUCDS = true;
      data['affiliated-organization'] = 'University of Calgary Debate Society';
      const updatedTypes = Array.isArray(data.type) ? [...data.type] : [];
      if (!updatedTypes.includes('Executive')) updatedTypes.push('Executive');
      data.type = updatedTypes;
      if (!data.biography && execCheck.officer?.bio) {
        data.biography = execCheck.officer.bio;
      }

      // Persist update in Firestore in background
      updateDoc(userDocRef, {
        isExecutive: true,
        isUCDS: true,
        'affiliated-organization': data['affiliated-organization'],
        type: data.type,
        ...(data.biography ? { biography: data.biography } : {}),
        'time-updated': serverTimestamp(),
      }).catch((e) => console.warn('Auto executive background sync failed:', e));
    }
  }

  clientCache.set(cacheKey, data, 10 * 60 * 1000);
  return data;
}

/**
 * Subscribe to live real-time updates for a user's profile in Firestore.
 * Updates immediately when isExecutive or other permissions change.
 */
export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  if (!db || !uid) {
    callback(null);
    return () => {};
  }

  const cacheKey = `user_profile_${uid}`;
  const userDocRef = doc(db, 'Users', uid);

  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        clientCache.set(cacheKey, data, 10 * 60 * 1000);
        callback(data);
      } else {
        clientCache.invalidate(cacheKey);
        callback(null);
      }
    },
    (err) => {
      console.error('Real-time profile subscription error:', err);
    }
  );
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
 * Automatically verifies and links executive privileges if any user email matches the Executive Roster.
 * Optimistically updates the local client cache.
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  // Check if any updated or provided email matches the Current UCDS Executive Roster
  const execCheck = await isEmailInExecutiveRoster([
    data['email-ucalgary'],
    data['email-preferred'],
    data['email-login'],
  ]);

  const mergedData: Partial<UserProfile> = { ...data };
  if (execCheck.isExec) {
    mergedData.isExecutive = true;
    mergedData.isUCDS = true;
    mergedData['affiliated-organization'] = 'University of Calgary Debate Society';
    const existingTypes = Array.isArray(mergedData.type) ? [...mergedData.type] : [];
    if (!existingTypes.includes('Executive')) {
      existingTypes.push('Executive');
    }
    mergedData.type = existingTypes;
    if (!mergedData.biography && execCheck.officer?.bio) {
      mergedData.biography = execCheck.officer.bio;
    }
  }

  const userDocRef = doc(db, 'Users', uid);
  await updateDoc(userDocRef, {
    ...mergedData,
    'time-updated': serverTimestamp(),
  });

  // Optimistically update client cache
  const cacheKey = `user_profile_${uid}`;
  const existing = clientCache.get<UserProfile>(cacheKey);
  if (existing) {
    clientCache.set(cacheKey, { ...existing, ...mergedData });
  }

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
  return await fetchAllOrganizations();
}

/**
 * Fetch University of Calgary Debate Society organization document with client caching.
 */
export async function getUcdsOrganization(forceRefresh = false): Promise<OrganizationDoc | null> {
  const cacheKey = 'org_ucds';
  if (!forceRefresh) {
    const cached = clientCache.get<OrganizationDoc>(cacheKey);
    if (cached) return cached;
  }

  if (!db) return null;
  // Try direct fetch with slugified document id
  try {
    const docRef = doc(db, 'Organizations', 'university-of-calgary-debate-society');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.id !== '_default') {
      const ucdsDoc = {
        id: docSnap.id,
        ...(docSnap.data() as Omit<OrganizationDoc, 'id'>),
      };
      clientCache.set(cacheKey, ucdsDoc, 30 * 60 * 1000);
      return ucdsDoc;
    }
  } catch (e) {
    console.warn('Direct UCDS doc lookup failed, checking collection:', e);
  }

  // Fallback: search Organizations collection for UCDS
  try {
    const allOrgs = await getOrganizations();
    const found = allOrgs.find(
      (org) =>
        org.id.toLowerCase().includes('ucds') ||
        org.id.toLowerCase().includes('calgary') ||
        org.name?.toLowerCase().includes('calgary') ||
        org['name-abbreviation']?.toUpperCase() === 'UCDS' ||
        org['name-abbreviated']?.toUpperCase() === 'UCDS'
    );
    if (found) {
      clientCache.set(cacheKey, found, 30 * 60 * 1000);
    }
    return found || null;
  } catch (err) {
    console.error('Failed to get UCDS organization doc:', err);
    return null;
  }
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
 * Fetch a subscriber's current subscription record from cache or Firestore.
 */
export async function getSubscriber(email: string, forceRefresh = false): Promise<SubscriberDoc | null> {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const cacheKey = `subscriber_${cleanEmail}`;

  if (!forceRefresh) {
    const cached = clientCache.get<SubscriberDoc>(cacheKey);
    if (cached) return cached;
  }

  if (!db) return null;
  const subscriberRef = doc(db, 'Subscribers', cleanEmail);
  const snap = await getDoc(subscriberRef);
  if (!snap.exists()) return null;

  const data = snap.data() as SubscriberDoc;
  clientCache.set(cacheKey, data, 15 * 60 * 1000);
  return data;
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

export const USERS_CACHE_KEY = 'all_users_directory';
export const PREV_EXEC_CACHE_KEY = 'previous_executive_years';

export type UserDirectoryEntry = UserProfile & { id: string };

/**
 * Fetch all users from Firestore collection Users with client-side caching.
 */
export async function fetchAllUsers(forceRefresh = false): Promise<UserDirectoryEntry[]> {
  if (!forceRefresh) {
    const cached = clientCache.get<UserDirectoryEntry[]>(USERS_CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  if (!db) return [];

  try {
    const usersRef = collection(db, 'Users');
    const snap = await getDocs(usersRef);

    const userList: UserDirectoryEntry[] = [];
    snap.forEach((docSnap) => {
      if (docSnap.id === '_default' || docSnap.id.toLowerCase() === '_default') return;
      const data = docSnap.data() as UserProfile;
      userList.push({
        ...data,
        id: docSnap.id,
      });
    });

    clientCache.set(USERS_CACHE_KEY, userList, 10 * 60 * 1000);
    return userList;
  } catch (err) {
    console.error('Failed to fetch all users from Firestore:', err);
    return [];
  }
}

/**
 * Update member privileges and attributes (isPaid, isExecutive, isRestricted, biography, etc.).
 * Optimistically updates local cache.
 */
export async function updateUserPrivileges(
  uid: string,
  fields: Partial<UserProfile>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  const userDocRef = doc(db, 'Users', uid);
  await updateDoc(userDocRef, {
    ...fields,
    'time-updated': serverTimestamp(),
  });

  // Optimistically update single profile cache
  const profileKey = `user_profile_${uid}`;
  const existingProfile = clientCache.get<UserProfile>(profileKey);
  if (existingProfile) {
    clientCache.set(profileKey, { ...existingProfile, ...fields });
  }

  // Optimistically update directory list cache
  clientCache.updateCollectionItem<UserDirectoryEntry>(USERS_CACHE_KEY, uid, fields);
}

// ---------------------------------------------------------------------------
// Previous Executive Teams Management (`Executive-Previous` collection)
// ---------------------------------------------------------------------------

export interface PreviousExecutiveOfficer {
  'name-first'?: string;
  'name-last'?: string;
  name?: string;
  role?: string;
  email?: string;
  bio?: string;
}

export interface PreviousExecutiveYearDoc {
  id: string; // e.g. "2024-2025"
  executives: Record<string, PreviousExecutiveOfficer>;
  'time-updated'?: unknown;
  'time-created'?: unknown;
}

/**
 * Sanitize executive role keys:
 * - lowercase, numbers and symbols removed, "of" removed
 * - spaces replaced with hyphens
 * - duplicates appended with -1, -2, etc.
 */
export function formatExecRoleKey(role: string, existingKeys: string[] = []): string {
  let base = role
    .toLowerCase()
    .replace(/\bof\b/g, '')
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  if (!base) base = 'executive';

  if (!existingKeys.includes(base)) {
    return base;
  }

  let counter = 1;
  let candidate = `${base}-${counter}`;
  while (existingKeys.includes(candidate)) {
    counter++;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

/**
 * Fetch all historical executive teams from Firestore collection `Executive-Previous`.
 */
export async function fetchPreviousExecutiveYears(forceRefresh = false): Promise<PreviousExecutiveYearDoc[]> {
  if (!forceRefresh) {
    const cached = clientCache.get<PreviousExecutiveYearDoc[]>(PREV_EXEC_CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  if (!db) return [];

  try {
    const prevRef = collection(db, 'Executive-Previous');
    const snap = await getDocs(prevRef);

    const yearDocs: PreviousExecutiveYearDoc[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      yearDocs.push({
        id: docSnap.id,
        executives: (typeof data.executives === 'object' && data.executives !== null ? data.executives : {}) as Record<string, PreviousExecutiveOfficer>,
        'time-updated': data['time-updated'],
        'time-created': data['time-created'],
      });
    });

    // Sort descending by academic year (e.g. 2024-2025 before 2023-2024)
    const sorted = yearDocs.sort((a, b) => b.id.localeCompare(a.id));
    clientCache.set(PREV_EXEC_CACHE_KEY, sorted, 15 * 60 * 1000);
    return sorted;
  } catch (err) {
    console.error('Failed to fetch Executive-Previous records:', err);
    return [];
  }
}

/**
 * Recursively removes all undefined values from an object to ensure Firestore compatibility.
 */
export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value !== undefined) {
      clean[key] = sanitizeFirestoreData(value);
    }
  }
  return clean as T;
}

/**
 * Save or update a historical executive team document in `Executive-Previous/{yearId}`.
 */
export async function savePreviousExecutiveYear(
  yearId: string,
  executives: Record<string, PreviousExecutiveOfficer>,
  isNew = false
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const cleanYearId = yearId.trim();
  if (!cleanYearId) throw new Error('Year identifier is required.');

  const cleanExecutives = sanitizeFirestoreData(executives);
  const docRef = doc(db, 'Executive-Previous', cleanYearId);
  const payload: Record<string, unknown> = {
    executives: cleanExecutives,
    'time-updated': serverTimestamp(),
  };

  if (isNew) {
    payload['time-created'] = serverTimestamp();
    await setDoc(docRef, payload);
    clientCache.addCollectionItem<PreviousExecutiveYearDoc>(PREV_EXEC_CACHE_KEY, {
      id: cleanYearId,
      executives: cleanExecutives,
      'time-updated': new Date().toISOString(),
    });
  } else {
    await setDoc(docRef, payload, { merge: true });
    clientCache.updateCollectionItem<PreviousExecutiveYearDoc>(PREV_EXEC_CACHE_KEY, cleanYearId, {
      executives: cleanExecutives,
      'time-updated': new Date().toISOString(),
    });
  }
}

/**
 * Delete a historical executive team document from `Executive-Previous/{yearId}`.
 */
export async function deletePreviousExecutiveYear(yearId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const docRef = doc(db, 'Executive-Previous', yearId.trim());
  await deleteDoc(docRef);

  clientCache.removeCollectionItem(PREV_EXEC_CACHE_KEY, yearId.trim());
}

// ---------------------------------------------------------------------------
// Current Executive Roster Management (Ordered Hierarchy)
// ---------------------------------------------------------------------------

export interface DefaultExecutiveSlot {
  key: string;
  roleName: string;
  order: number;
}

export const DEFAULT_UCDS_EXECUTIVE_SLOTS: DefaultExecutiveSlot[] = [
  { key: 'president', roleName: 'President', order: 1 },
  { key: 'vice-president-finance', roleName: 'Vice-President Finance', order: 2 },
  { key: 'vice-president-internal', roleName: 'Vice-President Internal', order: 3 },
  { key: 'vice-president-outreach', roleName: 'Vice-President Outreach', order: 4 },
  { key: 'director-training-1', roleName: 'Director of Training', order: 5 },
  { key: 'director-training-2', roleName: 'Director of Training', order: 6 },
  { key: 'director-equity', roleName: 'Director of Equity', order: 7 },
  { key: 'director-tournaments', roleName: 'Director of Tournaments', order: 8 },
  { key: 'senior-advisor', roleName: 'Senior Advisor', order: 9 },
  { key: 'junior-executive-1', roleName: 'Junior Executive', order: 10 },
  { key: 'junior-executive-2', roleName: 'Junior Executive', order: 11 },
];

export interface CurrentExecutiveOfficer extends PreviousExecutiveOfficer {
  key: string;
  roleTitle: string;
  isRegisteredUser?: boolean;
  registeredUid?: string;
  registeredUsername?: string;
  userProfile?: UserProfile;
}

/**
 * Fetch the Current UCDS Executive Roster, automatically feeding registered user data
 * for any matching @ucalgary.ca emails.
 */
export async function fetchCurrentExecutiveRoster(forceRefresh = false): Promise<CurrentExecutiveOfficer[]> {
  const ucdsOrg = await getUcdsOrganization(forceRefresh);
  const orgExecs = (ucdsOrg?.executives || {}) as Record<string, PreviousExecutiveOfficer>;

  // Also fetch all users to correlate registered officers by email
  const allUsers = await fetchAllUsers(forceRefresh);

  const officers: CurrentExecutiveOfficer[] = [];

  // 1. First map standard predefined executive slots in order
  DEFAULT_UCDS_EXECUTIVE_SLOTS.forEach((slot) => {
    const rawData = orgExecs[slot.key] || {};
    const email = (rawData.email || '').trim().toLowerCase();

    // Match registered user by @ucalgary.ca or login/preferred email
    const matchedUser = email
      ? allUsers.find(
        (u) =>
          (u['email-ucalgary'] && u['email-ucalgary'].toLowerCase() === email) ||
            (u['email-login'] && u['email-login'].toLowerCase() === email) ||
            (u['email-preferred'] && u['email-preferred'].toLowerCase() === email)
      )
      : undefined;

    const firstName = matchedUser ? matchedUser['name-first'] : rawData['name-first'] || '';
    const lastName = matchedUser ? matchedUser['name-last'] : rawData['name-last'] || '';
    const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : rawData.name || '';
    const bio = matchedUser?.biography || rawData.bio || '';

    officers.push({
      key: slot.key,
      roleTitle: slot.roleName,
      'name-first': firstName,
      'name-last': lastName,
      name: fullName,
      role: slot.roleName,
      email: rawData.email || matchedUser?.['email-ucalgary'] || matchedUser?.['email-login'] || '',
      bio,
      isRegisteredUser: Boolean(matchedUser),
      registeredUid: matchedUser?.id,
      registeredUsername: matchedUser?.username,
      userProfile: matchedUser,
    });
  });

  // 2. Map any custom/additional executive slots in the org document not in default slots
  Object.entries(orgExecs).forEach(([k, rawData]) => {
    if (!DEFAULT_UCDS_EXECUTIVE_SLOTS.some((s) => s.key === k)) {
      const email = (rawData.email || '').trim().toLowerCase();
      const matchedUser = email
        ? allUsers.find(
          (u) =>
            (u['email-ucalgary'] && u['email-ucalgary'].toLowerCase() === email) ||
                (u['email-login'] && u['email-login'].toLowerCase() === email) ||
                (u['email-preferred'] && u['email-preferred'].toLowerCase() === email)
        )
        : undefined;

      const firstName = matchedUser ? matchedUser['name-first'] : rawData['name-first'] || '';
      const lastName = matchedUser ? matchedUser['name-last'] : rawData['name-last'] || '';
      const fullName = firstName || lastName ? `${firstName} ${lastName}`.trim() : rawData.name || '';
      const bio = matchedUser?.biography || rawData.bio || '';
      const roleTitle = rawData.role || k.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      officers.push({
        key: k,
        roleTitle,
        'name-first': firstName,
        'name-last': lastName,
        name: fullName,
        role: roleTitle,
        email: rawData.email || matchedUser?.['email-ucalgary'] || matchedUser?.['email-login'] || '',
        bio,
        isRegisteredUser: Boolean(matchedUser),
        registeredUid: matchedUser?.id,
        registeredUsername: matchedUser?.username,
        userProfile: matchedUser,
      });
    }
  });

  return officers;
}

/**
 * Save Current Executive Roster into the UCDS Organization document in Firestore.
 */
export async function saveCurrentExecutiveRoster(
  executivesMap: Record<string, PreviousExecutiveOfficer>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');

  const cleanExecutives = sanitizeFirestoreData(executivesMap);
  const ucdsDocRef = doc(db, 'Organizations', 'university-of-calgary-debate-society');

  try {
    const existingSnap = await getDoc(ucdsDocRef);

    if (existingSnap.exists()) {
      await updateDoc(ucdsDocRef, {
        executives: cleanExecutives,
        'time-updated': serverTimestamp(),
      });
    } else {
      await setDoc(ucdsDocRef, {
        name: 'University of Calgary Debate Society',
        'name-abbreviation': 'UCDS',
        'name-affiliated': 'University of Calgary',
        type: ['club'],
        formats: ['BP', 'CP'],
        location: {
          country: 'Canada',
          province: 'Alberta',
          city: 'Calgary',
        },
        email: 'debate@ucalgary.ca',
        executives: cleanExecutives,
        'time-created': serverTimestamp(),
        'time-updated': serverTimestamp(),
      });
    }
  } catch {
    // If updateDoc fails because document doesn't exist, use setDoc with merge
    await setDoc(
      ucdsDocRef,
      {
        name: 'University of Calgary Debate Society',
        'name-abbreviation': 'UCDS',
        'name-affiliated': 'University of Calgary',
        type: ['club'],
        formats: ['BP', 'CP'],
        location: {
          country: 'Canada',
          province: 'Alberta',
          city: 'Calgary',
        },
        email: 'debate@ucalgary.ca',
        executives: cleanExecutives,
        'time-updated': serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Auto-sync executive privileges to any registered user in Users collection whose email is in this roster
  try {
    const allUsers = await fetchAllUsers(true);
    for (const rawOfficer of Object.values(cleanExecutives)) {
      const off = rawOfficer as PreviousExecutiveOfficer;
      const offEmail = (off.email || '').trim().toLowerCase();
      if (!offEmail) continue;

      const matchedUser = allUsers.find(
        (u) =>
          (u['email-ucalgary'] && u['email-ucalgary'].toLowerCase() === offEmail) ||
          (u['email-login'] && u['email-login'].toLowerCase() === offEmail) ||
          (u['email-preferred'] && u['email-preferred'].toLowerCase() === offEmail)
      );

      if (matchedUser && (!matchedUser.isExecutive || !matchedUser.isUCDS)) {
        const updatedTypes = Array.isArray(matchedUser.type) ? [...matchedUser.type] : [];
        if (!updatedTypes.includes('Executive')) updatedTypes.push('Executive');

        await updateDoc(doc(db, 'Users', matchedUser.id), {
          isExecutive: true,
          isUCDS: true,
          'affiliated-organization': 'University of Calgary Debate Society',
          type: updatedTypes,
          ...(off.bio && !matchedUser.biography ? { biography: off.bio } : {}),
          'time-updated': serverTimestamp(),
        }).catch((err) => console.warn('Auto sync for user failed:', err));
      }
    }
  } catch (err) {
    console.warn('Auto sync of executive privileges for registered users encountered an error:', err);
  }

  // Invalidate all organization caches so all readers get fresh roster immediately
  clientCache.invalidate('org_ucds');
  clientCache.invalidate(ORGS_CACHE_KEY);
}

