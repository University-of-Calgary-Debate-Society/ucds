import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { clientCache } from '@/utils/clientCache';

export const EVENTS_CACHE_KEY = 'debate_events';

export interface DebateEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  format: 'British Parliamentary' | 'Canadian Parliamentary' | 'World Schools' | 'Workshop';
  description: string;
  registrationOpen: boolean;
}

// Fallback demo events for offline/initial setup testing
export const DEMO_EVENTS: DebateEvent[] = [
  {
    id: 'ucds-fall-bp-2026',
    title: 'UCDS Fall British Parliamentary Invitational',
    date: 'October 17-18, 2026',
    location: 'University of Calgary Campus / Science Theatres',
    format: 'British Parliamentary',
    description: 'Premier fall tournament hosted by UCDS welcoming collegiate debaters across North America.',
    registrationOpen: true,
  },
  {
    id: 'novice-workshop-2026',
    title: 'Novice Debate & Public Speaking Bootcamp',
    date: 'September 24, 2026',
    location: 'MacEwan Hall Conference Room',
    format: 'Workshop',
    description: 'Comprehensive introduction to motion analysis, argument building, and whip speeches.',
    registrationOpen: true,
  },
  {
    id: 'winter-hart-house-prep',
    title: 'Hart House & CUSID Winter Training Scrimmage',
    date: 'November 14, 2026',
    location: 'Online (Discord / Zoom)',
    format: 'Canadian Parliamentary',
    description: 'Intensive practice rounds with judge feedback to prepare for national championships.',
    registrationOpen: false,
  },
];

/**
 * Fetch list of debate events with client-side caching (from cache, Firestore, or demo data)
 */
export async function getDebateEvents(forceRefresh = false): Promise<DebateEvent[]> {
  if (!forceRefresh) {
    const cached = clientCache.get<DebateEvent[]>(EVENTS_CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  if (!db || !isFirebaseConfigured()) {
    return DEMO_EVENTS;
  }

  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('date', 'desc'), limit(20));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      clientCache.set(EVENTS_CACHE_KEY, DEMO_EVENTS, 10 * 60 * 1000);
      return DEMO_EVENTS;
    }

    const fetched = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<DebateEvent, 'id'>),
    }));

    clientCache.set(EVENTS_CACHE_KEY, fetched, 10 * 60 * 1000);
    return fetched;
  } catch (error) {
    console.warn('Firestore fetch notice, using fallback data:', error);
    return DEMO_EVENTS;
  }
}

/**
 * Save or update a debate event in Firestore and optimistically update local cache
 */
export async function saveDebateEvent(event: DebateEvent): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured. Please add Firebase credentials to .env.local.');
  }

  const eventRef = doc(db, 'events', event.id);
  await setDoc(eventRef, event, { merge: true });

  clientCache.addCollectionItem(EVENTS_CACHE_KEY, event);
}

/**
 * Delete a debate event from Firestore and remove from local cache
 */
export async function removeDebateEvent(eventId: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured. Please add Firebase credentials to .env.local.');
  }

  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);

  clientCache.removeCollectionItem(EVENTS_CACHE_KEY, eventId);
}
