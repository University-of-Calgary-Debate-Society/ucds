import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { UserProfile } from './userService';

export interface PaymentBill {
  id: string; // Document name, e.g. 'membership-fee-2627' or '_default'
  name: string;
  description: string;
  amount: number; // e.g. 25.00
  amountFormatted: string; // e.g. "$25.00 CAD"
  category: string;
  'allowed-payments': ('etransfer' | 'paypal' | 'stripe' | string)[];
  completed: string[]; // List of user emails that have paid
  incomplete: string[]; // List of user emails that have not paid
  'completed-institution': string[];
  'incomplete-institution': string[];
  'time-open'?: string | null; // ISO string / timestamp
  'time-deadline'?: string | null; // ISO string / timestamp
  'time-created'?: string;
  'time-updated'?: string;
}

export interface UserPayableItem {
  id: string;
  title: string;
  category: string;
  amountCents: number;
  amountFormatted: string;
  description: string;
  allowedPayments: string[];
  isMembershipDues: boolean;
  statusText: string;
  statusType: 'paid' | 'unpaid' | 'exempt' | 'upcoming' | 'closed';
  timeOpen?: string | null;
  timeDeadline?: string | null;
  timeOpenFormatted?: string | null;
  timeDeadlineFormatted?: string | null;
  isOpen: boolean; // True if current time >= time-open (or no time-open) AND current time <= time-deadline (or no time-deadline)
  isUpcoming: boolean; // True if current time < time-open
  isClosed: boolean; // True if current time > time-deadline
  isListed: boolean;
}

// Default template document for Firestore schema initialization (must NEVER appear on webapp)
export const PAYMENTS_DEFAULT_TEMPLATE: PaymentBill = {
  id: '_default',
  name: '',
  description: '',
  amount: 0,
  amountFormatted: '',
  category: '',
  'allowed-payments': [],
  completed: [],
  incomplete: [],
  'completed-institution': [],
  'incomplete-institution': [],
  'time-open': null,
  'time-deadline': null,
  'time-created': '',
  'time-updated': '',
};

// Default initial membership fee document ID
export const DEFAULT_MEMBERSHIP_FEE_ID = 'membership-fee-2627';

// Default starter bill template for 2026/2027 Society Dues
export const DEFAULT_MEMBERSHIP_BILL: PaymentBill = {
  id: DEFAULT_MEMBERSHIP_FEE_ID,
  name: 'UCDS Society Annual Membership Dues (2026/2027)',
  description:
    'Official membership registration for the full academic year. Grants tournament eligibility, coaching access, voting privileges at AGM, and society social event entry.',
  amount: 25.0,
  amountFormatted: '$25.00 CAD',
  category: 'Society Dues',
  'allowed-payments': ['etransfer', 'paypal', 'stripe'],
  completed: [],
  incomplete: [],
  'completed-institution': [],
  'incomplete-institution': [],
  'time-open': null, // Open immediately
  'time-deadline': null, // Open throughout academic year
};

// Fallback demo payment items when offline
export const FALLBACK_PAYMENT_BILLS: PaymentBill[] = [
  DEFAULT_MEMBERSHIP_BILL,
  {
    id: 'calgary-invitational-2026',
    name: 'Calgary Invitational Debate Tournament Registration',
    description:
      'Team entry fee for the annual Calgary Invitational BP Debate Open. Includes 5 preliminary debate rounds, adjudication, dinner, and awards banquet.',
    amount: 45.0,
    amountFormatted: '$45.00 CAD',
    category: 'Tournament Fee',
    'allowed-payments': ['stripe', 'etransfer'],
    completed: [],
    incomplete: [],
    'completed-institution': [],
    'incomplete-institution': [],
    'time-open': null,
    'time-deadline': '2026-10-15T23:59:59.000Z',
  },
  {
    id: 'highschool-open-2026',
    name: 'Calgary High School Debate Open — Adjudicator Pass',
    description:
      'Registration for accredited volunteer judges and adjudicator trainees at the Calgary High School Championship.',
    amount: 15.0,
    amountFormatted: '$15.00 CAD',
    category: 'Event Pass',
    'allowed-payments': ['stripe', 'paypal', 'etransfer'],
    completed: [],
    incomplete: [],
    'completed-institution': [],
    'incomplete-institution': [],
    'time-open': '2026-09-01T00:00:00.000Z',
    'time-deadline': '2026-11-20T23:59:59.000Z',
  },
  {
    id: 'national-champs-deposit-2026',
    name: 'National Championships Travel & Accommodations Deposit',
    description:
      'Travel squad security deposit for debaters selected to represent UCDS at regional and national debate championships.',
    amount: 100.0,
    amountFormatted: '$100.00 CAD',
    category: 'Travel Deposit',
    'allowed-payments': ['stripe', 'etransfer'],
    completed: [],
    incomplete: [],
    'completed-institution': [],
    'incomplete-institution': [],
    'time-open': null,
    'time-deadline': null,
  },
];

/**
 * Parses any Firestore timestamp, string, or number to a standard Date object.
 */
export function parseTimestampToDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  if (typeof val === 'number') {
    return new Date(val);
  }
  return null;
}

/**
 * Formats a Date object into human-readable date/time string.
 */
export function formatFriendlyDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Initializes the collection with the required `_default` template document if not present.
 * Note: `_default` must never appear on the webapp.
 */
export async function ensurePaymentsDefaultDoc(): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;

  try {
    const defaultDocRef = doc(db, 'Payments', '_default');
    const snap = await getDoc(defaultDocRef);

    if (!snap.exists()) {
      await setDoc(defaultDocRef, {
        ...PAYMENTS_DEFAULT_TEMPLATE,
        'time-created': new Date().toISOString(),
        'time-updated': new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Notice: Failed to initialize Payments _default template:', err);
  }
}

/**
 * Ensures the default `membership-fee-2627` document exists in Firestore.
 */
export async function ensureMembershipFeeDoc(): Promise<PaymentBill> {
  if (!db || !isFirebaseConfigured()) {
    return DEFAULT_MEMBERSHIP_BILL;
  }

  // Ensure _default template exists in the collection as required
  await ensurePaymentsDefaultDoc();

  try {
    const feeDocRef = doc(db, 'Payments', DEFAULT_MEMBERSHIP_FEE_ID);
    const snap = await getDoc(feeDocRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        name: data.name || DEFAULT_MEMBERSHIP_BILL.name,
        description: data.description || DEFAULT_MEMBERSHIP_BILL.description,
        amount: typeof data.amount === 'number' ? data.amount : 25.0,
        amountFormatted: data.amountFormatted || `$${(data.amount || 25).toFixed(2)} CAD`,
        category: data.category || 'Society Dues',
        'allowed-payments': data['allowed-payments'] || ['etransfer', 'paypal', 'stripe'],
        completed: data.completed || [],
        incomplete: data.incomplete || [],
        'completed-institution': data['completed-institution'] || [],
        'incomplete-institution': data['incomplete-institution'] || [],
        'time-open': data['time-open'] || null,
        'time-deadline': data['time-deadline'] || null,
        'time-created': data['time-created'],
        'time-updated': data['time-updated'],
      };
    }

    // Initialize document in Payments collection
    await setDoc(feeDocRef, {
      ...DEFAULT_MEMBERSHIP_BILL,
      'time-created': new Date().toISOString(),
      'time-updated': new Date().toISOString(),
      timestamp: serverTimestamp(),
    });

    return DEFAULT_MEMBERSHIP_BILL;
  } catch (err) {
    console.warn('Failed to ensure membership fee doc:', err);
    return DEFAULT_MEMBERSHIP_BILL;
  }
}

/**
 * Synchronizes a user with the `membership-fee-2627` document.
 * If user has `isUCDS: true`, ensures their email is documented in `completed` (if isPaid) or `incomplete` (if not isPaid).
 */
export async function syncUserMembershipFeeStatus(
  profile: UserProfile,
  userEmail: string
): Promise<void> {
  if (!db || !isFirebaseConfigured() || !profile) return;

  const targetEmail = (profile['email-preferred'] || profile['email-login'] || userEmail || '')
    .trim()
    .toLowerCase();

  if (!targetEmail) return;

  try {
    const feeDocRef = doc(db, 'Payments', DEFAULT_MEMBERSHIP_FEE_ID);
    const snap = await getDoc(feeDocRef);

    let docData: Partial<PaymentBill> = DEFAULT_MEMBERSHIP_BILL;
    if (!snap.exists()) {
      await setDoc(feeDocRef, {
        ...DEFAULT_MEMBERSHIP_BILL,
        'time-created': new Date().toISOString(),
        'time-updated': new Date().toISOString(),
      });
    } else {
      docData = snap.data() as Partial<PaymentBill>;
    }

    const completed = (docData.completed || []).map((e) => e.toLowerCase());
    const incomplete = (docData.incomplete || []).map((e) => e.toLowerCase());

    const isPaid = Boolean(profile.isPaid);
    const isUCDS = Boolean(profile.isUCDS);

    // Only document UCDS members by default as requested
    if (!isUCDS) return;

    if (isPaid) {
      // Ensure in completed, remove from incomplete
      if (!completed.includes(targetEmail)) {
        await updateDoc(feeDocRef, {
          completed: arrayUnion(targetEmail),
          incomplete: arrayRemove(targetEmail),
          'time-updated': new Date().toISOString(),
        });
      }
    } else {
      // Unpaid UCDS member: ensure in incomplete (unless already in completed)
      if (!completed.includes(targetEmail) && !incomplete.includes(targetEmail)) {
        await updateDoc(feeDocRef, {
          incomplete: arrayUnion(targetEmail),
          'time-updated': new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('Notice: Failed to sync membership fee status:', err);
  }
}

/**
 * Fetches all payment bills from Firestore and returns only those that list the user by email or institution,
 * evaluating `time-open` and `time-deadline` for display and payment completion permissions.
 */
export async function getUserPayableItems(
  profile: UserProfile,
  userEmail: string
): Promise<UserPayableItem[]> {
  const userEmails = [
    profile['email-login'],
    profile['email-preferred'],
    profile['email-ucalgary'],
    userEmail,
  ]
    .filter(Boolean)
    .map((e) => e!.trim().toLowerCase());

  const userAffiliation = (profile['affiliated-organization'] || '').trim().toLowerCase();

  const isAlumni = Boolean(
    profile?.type && profile.type.some((r) => r.toLowerCase() === 'alumni')
  );
  const isExecutive = Boolean(profile?.isExecutive);
  const isUCDS = Boolean(profile?.isUCDS);

  let allBills: PaymentBill[] = [];

  if (db && isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(db, 'Payments'));
      if (!snap.empty) {
        allBills = snap.docs
          // CRITICAL RULE: Make sure `_default` does not appear on the webapp
          .filter((d) => d.id !== '_default' && !d.id.startsWith('_'))
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || d.id,
              description: data.description || '',
              amount: typeof data.amount === 'number' ? data.amount : 25.0,
              amountFormatted:
                data.amountFormatted || `$${(data.amount || 25).toFixed(2)} CAD`,
              category: data.category || (d.id.includes('membership') ? 'Society Dues' : 'Event Fee'),
              'allowed-payments': data['allowed-payments'] || ['etransfer', 'paypal', 'stripe'],
              completed: data.completed || [],
              incomplete: data.incomplete || [],
              'completed-institution': data['completed-institution'] || [],
              'incomplete-institution': data['incomplete-institution'] || [],
              'time-open': data['time-open'] || null,
              'time-deadline': data['time-deadline'] || null,
            };
          });
      }
    } catch (err) {
      console.warn('Payments fetch notice, falling back to local defaults:', err);
    }
  }

  if (allBills.length === 0) {
    allBills = [...FALLBACK_PAYMENT_BILLS];
  }

  // Ensure default membership fee bill is included
  const hasMembershipBill = allBills.some((b) => b.id === DEFAULT_MEMBERSHIP_FEE_ID);
  if (!hasMembershipBill) {
    allBills.unshift(DEFAULT_MEMBERSHIP_BILL);
  }

  const now = new Date();
  const payableItems: UserPayableItem[] = [];

  for (const bill of allBills) {
    // Skip any template items
    if (bill.id === '_default' || bill.id.startsWith('_')) continue;

    const isMembership = bill.id === DEFAULT_MEMBERSHIP_FEE_ID;

    const completedEmails = bill.completed.map((e) => e.toLowerCase());
    const incompleteEmails = bill.incomplete.map((e) => e.toLowerCase());
    const completedInst = bill['completed-institution'].map((i) => i.toLowerCase());
    const incompleteInst = bill['incomplete-institution'].map((i) => i.toLowerCase());

    const isEmailCompleted = userEmails.some((e) => completedEmails.includes(e));
    const isEmailIncomplete = userEmails.some((e) => incompleteEmails.includes(e));
    const isInstCompleted = userAffiliation && completedInst.includes(userAffiliation);
    const isInstIncomplete = userAffiliation && incompleteInst.includes(userAffiliation);

    // If it's the society membership dues, UCDS members or listed members get it displayed
    const isListed =
      isEmailCompleted ||
      isEmailIncomplete ||
      Boolean(isInstCompleted) ||
      Boolean(isInstIncomplete) ||
      (isMembership && isUCDS);

    if (!isListed) {
      // If not listed for this event/bill, skip from user dashboard
      continue;
    }

    const isPaid = isEmailCompleted || isInstCompleted || (isMembership && Boolean(profile.isPaid));

    // Time-window logic for time-open & time-deadline
    const openDate = parseTimestampToDate(bill['time-open']);
    const deadlineDate = parseTimestampToDate(bill['time-deadline']);

    const isUpcoming = Boolean(openDate && now < openDate);
    const isClosed = Boolean(deadlineDate && now > deadlineDate);
    const isOpen = !isUpcoming && !isClosed;

    const timeOpenFormatted = openDate ? formatFriendlyDate(openDate) : null;
    const timeDeadlineFormatted = deadlineDate ? formatFriendlyDate(deadlineDate) : null;

    let statusType: 'paid' | 'unpaid' | 'exempt' | 'upcoming' | 'closed' = 'unpaid';
    let statusText = 'Payment Required';

    if (isMembership) {
      if (isAlumni) {
        statusType = 'exempt';
        statusText = 'Alumni (Dues Exempt)';
      } else if (isExecutive) {
        statusType = 'exempt';
        statusText = 'Executive (Dues Exempt)';
      } else if (!profile.isUCDS) {
        statusType = 'exempt';
        statusText = 'External Account (No Dues)';
      } else if (isPaid) {
        statusType = 'paid';
        statusText = 'Verified & Paid';
      } else if (isUpcoming) {
        statusType = 'upcoming';
        statusText = `Opens ${timeOpenFormatted}`;
      } else if (isClosed) {
        statusType = 'closed';
        statusText = 'Dues Deadline Passed';
      } else {
        statusType = 'unpaid';
        statusText = timeDeadlineFormatted ? `Due ${timeDeadlineFormatted}` : 'Payment Required';
      }
    } else {
      if (isPaid) {
        statusType = 'paid';
        statusText = 'Verified & Paid';
      } else if (isUpcoming) {
        statusType = 'upcoming';
        statusText = `Opens ${timeOpenFormatted}`;
      } else if (isClosed) {
        statusType = 'closed';
        statusText = 'Payment Closed';
      } else {
        statusType = 'unpaid';
        statusText = timeDeadlineFormatted ? `Due ${timeDeadlineFormatted}` : 'Payment Required';
      }
    }

    const amountCents = Math.round((bill.amount || 25.0) * 100);

    payableItems.push({
      id: bill.id,
      title: bill.name,
      category: bill.category || 'Society Payment',
      amountCents,
      amountFormatted: bill.amountFormatted || `$${(bill.amount || 25).toFixed(2)} CAD`,
      description: bill.description,
      allowedPayments: bill['allowed-payments'] || ['etransfer', 'paypal', 'stripe'],
      isMembershipDues: isMembership,
      statusText,
      statusType,
      timeOpen: bill['time-open'] || null,
      timeDeadline: bill['time-deadline'] || null,
      timeOpenFormatted,
      timeDeadlineFormatted,
      isOpen,
      isUpcoming,
      isClosed,
      isListed: true,
    });
  }

  return payableItems;
}

/**
 * Records successful completion of payment for a bill, updating both Payments doc and Users doc.
 */
export async function recordBillPaymentCompletion(
  billId: string,
  userId: string,
  userEmail: string,
  provider: 'stripe' | 'paypal' | 'etransfer',
  orderId?: string
): Promise<void> {
  if (!db || !isFirebaseConfigured()) return;

  const targetEmail = userEmail.trim().toLowerCase();

  try {
    // 1. Update the Payments collection bill document (move email from incomplete to completed)
    const billRef = doc(db, 'Payments', billId);
    await updateDoc(billRef, {
      completed: arrayUnion(targetEmail),
      incomplete: arrayRemove(targetEmail),
      'time-updated': new Date().toISOString(),
    });

    // 2. If this is the official membership dues, set user's isPaid to true
    if (billId === DEFAULT_MEMBERSHIP_FEE_ID) {
      const userRef = doc(db, 'Users', userId);
      await updateDoc(userRef, {
        isPaid: true,
        'payment-provider': provider,
        'payment-order-id': orderId || `TXN_${Date.now()}`,
        'payment-verified-at': new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Failed to record bill payment completion:', err);
    throw err;
  }
}
