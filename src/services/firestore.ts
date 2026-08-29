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
 * Fetch list of debate events (from Firestore if configured, or returns demo data)
 */
export async function getDebateEvents(): Promise<DebateEvent[]> {
  if (!db || !isFirebaseConfigured()) {
    return DEMO_EVENTS;
  }

  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('date', 'desc'), limit(20));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return DEMO_EVENTS;
    }

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<DebateEvent, 'id'>),
    }));
  } catch (error) {
    console.warn('Firestore fetch notice, using fallback data:', error);
    return DEMO_EVENTS;
  }
}

/**
 * Save or update a debate event in Firestore
 */
export async function saveDebateEvent(event: DebateEvent): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured. Please add Firebase credentials to .env.local.');
  }

  const eventRef = doc(db, 'events', event.id);
  await setDoc(eventRef, event, { merge: true });
}

/**
 * Delete a debate event from Firestore
 */
export async function removeDebateEvent(eventId: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured. Please add Firebase credentials to .env.local.');
  }

  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
}
