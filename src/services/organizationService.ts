import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clientCache } from '@/utils/clientCache';

export const ORGS_CACHE_KEY = 'all_organizations';
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
  'email-finance'?: string;
  type?: string[];
  formats?: string[];
  isOnline?: boolean;
  links?: Record<string, string>;
  executives?: Record<string, { 'name-first'?: string; 'name-last'?: string; name?: string; email?: string }>;
  'time-created'?: unknown;
  'time-updated'?: unknown;
}

/**
 * Normalizes raw Firestore document data into a reliable, typed OrganizationDoc
 * conforming strictly to the Organizations collection schema.
 */
export function normalizeOrgDoc(id: string, raw: Record<string, unknown>): OrganizationDoc {
  const emailVal = typeof raw.email === 'string' ? raw.email.trim() : undefined;
  const rawEmailFinance = raw['email-finance'] || raw.emailFinance;
  const emailFinanceVal = typeof rawEmailFinance === 'string' && rawEmailFinance.trim() ? rawEmailFinance.trim() : emailVal;
  // Normalize formats to string[] in lowercase
  let formats: string[] = [];
  if (Array.isArray(raw.formats)) {
    formats = raw.formats.map((f) => String(f).toLowerCase().trim()).filter(Boolean);
  } else if (typeof raw.formats === 'string') {
    formats = raw.formats.split(',').map((s) => s.toLowerCase().trim()).filter(Boolean);
  }

  // Normalize type to string[]
  let type: string[] = [];
  if (Array.isArray(raw.type)) {
    type = raw.type.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof raw.type === 'string') {
    type = raw.type.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Normalize name-aliases to string[]
  let aliases: string[] = [];
  const rawAliases = raw['name-aliases'] || raw.aliases;
  if (Array.isArray(rawAliases)) {
    aliases = rawAliases.map((a) => String(a).trim()).filter(Boolean);
  } else if (typeof rawAliases === 'string') {
    aliases = rawAliases.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Normalize location map
  let location: OrganizationDoc['location'] = undefined;
  if (typeof raw.location === 'object' && raw.location !== null && !Array.isArray(raw.location)) {
    const loc = raw.location as Record<string, unknown>;
    const locCountry = loc.country ? String(loc.country).trim() : undefined;
    const locCity = loc.city ? String(loc.city).trim() : undefined;
    const locProvince = loc.province ? String(loc.province).trim() : undefined;
    const locAddress = loc.address ? String(loc.address).trim() : undefined;
    const locPostcode = loc.postcode ? String(loc.postcode).trim() : undefined;
    const locCusid = loc.cusidregion ? String(loc.cusidregion).toLowerCase().trim() : undefined;

    if (locCountry || locCity || locProvince || locAddress || locPostcode || locCusid) {
      location = {
        country: locCountry,
        city: locCity,
        province: locProvince,
        address: locAddress,
        postcode: locPostcode,
        cusidregion: locCusid,
      };
    }
  } else if (typeof raw.location === 'string' && raw.location.trim()) {
    location = { country: raw.location.trim() };
  }

  // Normalize links map
  let links: Record<string, string> | undefined = undefined;
  if (typeof raw.links === 'object' && raw.links !== null && !Array.isArray(raw.links)) {
    const linkEntries: [string, string][] = [];
    Object.entries(raw.links).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) {
        linkEntries.push([k.trim(), v.trim()]);
      }
    });
    if (linkEntries.length > 0) {
      links = Object.fromEntries(linkEntries);
    }
  }

  // Normalize executives map
  let executives: OrganizationDoc['executives'] = undefined;
  if (typeof raw.executives === 'object' && raw.executives !== null && !Array.isArray(raw.executives)) {
    const execEntries: [string, { 'name-first'?: string; 'name-last'?: string; name?: string; email?: string }][] = [];
    Object.entries(raw.executives).forEach(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        const execObj = v as Record<string, unknown>;
        const first = execObj['name-first'] ? String(execObj['name-first']).trim() : undefined;
        const last = execObj['name-last'] ? String(execObj['name-last']).trim() : undefined;
        const n = execObj.name ? String(execObj.name).trim() : undefined;
        const em = execObj.email ? String(execObj.email).trim() : undefined;

        if (first || last || n || em) {
          execEntries.push([
            k.trim(),
            {
              'name-first': first,
              'name-last': last,
              name: n,
              email: em,
            },
          ]);
        }
      }
    });
    if (execEntries.length > 0) {
      executives = Object.fromEntries(execEntries);
    }
  }

  const rawAbbrev = raw['name-abbreviation'] || raw['name-abbreviated'] || raw.abbreviation || raw.abbrev;
  const rawName = raw.name || raw.clubName || raw.orgName;

  return {
    id,
    name: rawName
      ? String(rawName).trim()
      : id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    'name-affiliated': (raw['name-affiliated'] || raw['name-institution'] || raw.affiliated || undefined) as string | undefined,
    'name-abbreviation': rawAbbrev ? String(rawAbbrev).trim() : undefined,
    'name-aliases': aliases.length > 0 ? aliases : undefined,
    location,
    formats: formats.length > 0 ? formats : undefined,
    isOnline: Boolean(raw.isOnline || raw['is-online']),
    email: emailVal,
    'email-finance': emailFinanceVal,
    type: type.length > 0 ? type : undefined,
    links,
    executives,
    'time-created': raw['time-created'] || raw.timeCreated,
    'time-updated': raw['time-updated'] || raw.timeUpdated,
  };
}

/**
 * Sanitize organization name to generate clean document ID
 * e.g. "University of Calgary Debate Society" -> "university-of-calgary-debate-society"
 * (spaces to hyphens, lowercase, symbols and numbers removed)
 */
export function sanitizeOrgId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Sanitize executive role to create nested field key
 * - spaces replaced with hyphens
 * - numerical and symbol values removed
 * - the word "of" completely removed
 * - lowercase
 * - suffixes -1, -2 if duplicate role exists
 * e.g. "Director of Training" -> "director-training", second one -> "director-training-2"
 */
export function sanitizeExecRoleKey(role: string, existingKeys: string[] = []): string {
  let base = role
    .toLowerCase()
    .replace(/\bof\b/g, '') // remove "of"
    .replace(/[^a-z\s-]/g, '') // remove numbers and symbols
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
 * Sanitize link key
 * - spaces replaced with hyphens
 * - lowercase, numbers and symbols removed
 * e.g. "Discord Server!" -> "discord-server"
 */
export function sanitizeLinkKey(key: string): string {
  const clean = key
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return clean || 'link';
}

/**
 * Fetch all debate organizations from cache first, or from Firestore collection Organizations.
 * Strictly excludes the internal _default template.
 */
export async function fetchAllOrganizations(forceRefresh = false): Promise<OrganizationDoc[]> {
  // 1. Check client-side cache
  if (!forceRefresh) {
    const cached = clientCache.get<OrganizationDoc[]>(ORGS_CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  if (!db) {
    console.warn('Firestore is not initialized.');
    return [];
  }

  const orgsRef = collection(db, 'Organizations');
  const snap = await getDocs(orgsRef);

  const orgs: OrganizationDoc[] = [];
  snap.forEach((docSnap) => {
    if (docSnap.id !== '_default' && !docSnap.id.startsWith('_')) {
      const normalized = normalizeOrgDoc(docSnap.id, docSnap.data());
      orgs.push(normalized);
    }
  });

  const sorted = orgs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // 2. Cache in memory and sessionStorage for 15 minutes
  clientCache.set(ORGS_CACHE_KEY, sorted, 15 * 60 * 1000);

  return sorted;
}

/**
 * Clean object to omit empty/undefined fields before sending to Firestore
 */
function cleanDocData(raw: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  Object.entries(raw).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;

    if (Array.isArray(v)) {
      if (v.length > 0) cleaned[k] = v;
      return;
    }

    if (typeof v === 'object' && !(v instanceof Date) && !('nanoseconds' in (v as object))) {
      const nested = cleanDocData(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) {
        cleaned[k] = nested;
      }
      return;
    }

    cleaned[k] = v;
  });

  return cleaned;
}

/**
 * Save (create or update) an organization directly in Firestore.
 */
export async function saveOrganization(
  orgData: Partial<OrganizationDoc>,
  isNew: boolean,
  originalId?: string
): Promise<string> {
  if (!db) throw new Error('Firebase Firestore is not initialized.');

  const name = (orgData.name || '').trim();
  if (!name) throw new Error('Organization name is required.');

  const docId = isNew || !originalId ? sanitizeOrgId(name) : originalId;
  if (!docId || docId === '_default') {
    throw new Error('Invalid organization identifier.');
  }

  // Clean location data
  const locationObj: Record<string, string> = {};
  if (orgData.location?.country?.trim()) locationObj.country = orgData.location.country.trim();
  if (orgData.location?.city?.trim()) locationObj.city = orgData.location.city.trim();
  if (orgData.location?.province?.trim()) locationObj.province = orgData.location.province.trim();
  if (orgData.location?.address?.trim()) locationObj.address = orgData.location.address.trim();
  if (orgData.location?.postcode?.trim()) locationObj.postcode = orgData.location.postcode.trim();

  // CUSID Region only for Canada
  if (
    orgData.location?.country?.toLowerCase() === 'canada' &&
    orgData.location?.cusidregion?.trim()
  ) {
    locationObj.cusidregion = orgData.location.cusidregion.toLowerCase().trim();
  }

  // Ensure formats are lowercase
  const formatsClean = (orgData.formats || [])
    .map((f) => f.toLowerCase().trim())
    .filter(Boolean);

  const payload: Record<string, unknown> = {
    name,
    'name-affiliated': orgData['name-affiliated']?.trim() || undefined,
    'name-abbreviation': orgData['name-abbreviation']?.trim() || undefined,
    'name-aliases': (orgData['name-aliases'] || []).map((a) => a.trim()).filter(Boolean),
    location: Object.keys(locationObj).length > 0 ? locationObj : undefined,
    formats: formatsClean.length > 0 ? formatsClean : undefined,
    isOnline: orgData.isOnline ?? false,
    email: orgData.email?.trim() || undefined,
    'email-finance': (orgData['email-finance'] || orgData.email)?.trim() || undefined,
    type: (orgData.type || []).map((t) => t.trim()).filter(Boolean),
    links: orgData.links && Object.keys(orgData.links).length > 0 ? orgData.links : undefined,
    executives: orgData.executives && Object.keys(orgData.executives).length > 0 ? orgData.executives : undefined,
    'time-updated': serverTimestamp(),
  };

  if (isNew) {
    payload['time-created'] = serverTimestamp();
  }

  const cleanedPayload = cleanDocData(payload);
  const docRef = doc(db, 'Organizations', docId);

  if (isNew) {
    await setDoc(docRef, cleanedPayload);
  } else {
    // If name changed in a way that creates a new ID, migrate doc
    if (originalId && originalId !== docId) {
      await setDoc(docRef, { ...cleanedPayload, 'time-created': serverTimestamp() });
      await deleteDoc(doc(db, 'Organizations', originalId)).catch(() => {});
      clientCache.removeCollectionItem(ORGS_CACHE_KEY, originalId);
    } else {
      await setDoc(docRef, cleanedPayload, { merge: true });
    }
  }

  // Optimistically update local cache with the newly saved/updated document
  const normalizedSaved = normalizeOrgDoc(docId, {
    ...cleanedPayload,
    'time-updated': new Date().toISOString(),
  });

  if (isNew || (originalId && originalId !== docId)) {
    clientCache.addCollectionItem(ORGS_CACHE_KEY, normalizedSaved);
  } else {
    clientCache.updateCollectionItem(ORGS_CACHE_KEY, docId, normalizedSaved);
  }

  return docId;
}

/**
 * Delete an organization directly from Firestore and remove from local client cache.
 */
export async function deleteOrganization(docId: string): Promise<void> {
  if (!db) throw new Error('Firebase Firestore is not initialized.');
  if (!docId || docId === '_default') {
    throw new Error('Cannot delete protected default document.');
  }

  const docRef = doc(db, 'Organizations', docId);
  await deleteDoc(docRef);

  // Optimistically remove from local client cache
  clientCache.removeCollectionItem(ORGS_CACHE_KEY, docId);
}
