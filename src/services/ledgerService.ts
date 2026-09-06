import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  documentId,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { clientCache } from '@/utils/clientCache';

export const LEDGER_CACHE_KEY = 'all_ledger_records';

export interface LedgerRecord {
  id: string;
  recipient: string; // Stored as recipient (e.g. "UCDS" if inbound, or person/org)
  sender: string; // Stored as sender (e.g. person/org, or "UCDS" if outbound)
  email: string; // Associated email with transaction
  method: 'Stripe' | 'PayPal' | 'E-transfer' | 'Other' | string; // Payment channel
  amount?: number; // Inbound deposit float - ONLY stored if deposit to save space
  withdrawl?: number; // Outbound withdrawal float - ONLY stored if withdrawal to save space
  details: string; // Transaction details (unsortable in table)
  'time-created': string | number | { seconds: number } | Date; // Firestore timestamp, shown as DD/MM/YYYY
  'time-updated'?: string | number | { seconds: number } | Date;
}

// Starter fallback records when offline or empty
export const FALLBACK_LEDGER_RECORDS: LedgerRecord[] = [
  {
    id: 'l-seed-1',
    recipient: 'UCDS',
    sender: 'Michael Chang',
    email: 'm.chang@ucalgary.ca',
    method: 'Stripe',
    amount: 25.0,
    details: 'Annual Society Membership Dues 2026/2027',
    'time-created': new Date(2026, 7, 28).toISOString(),
  },
  {
    id: 'l-seed-2',
    recipient: 'UCDS',
    sender: 'Sarah Al-Mansoor',
    email: 'sarah.almansoor@ucalgary.ca',
    method: 'PayPal',
    amount: 25.0,
    details: 'Annual Society Membership Dues 2026/2027',
    'time-created': new Date(2026, 7, 29).toISOString(),
  },
  {
    id: 'l-seed-3',
    recipient: 'UCDS',
    sender: 'SU Club Funding Grant',
    email: 'funding@su.ucalgary.ca',
    method: 'E-transfer',
    amount: 1500.0,
    details: 'Fall Term Undergraduate Club Operational Grant Allocation',
    'time-created': new Date(2026, 8, 1).toISOString(),
  },
  {
    id: 'l-seed-4',
    recipient: 'Calgary Trophy & Awards Co.',
    sender: 'UCDS',
    email: 'sales@calgaryawards.ca',
    method: 'Other',
    withdrawl: 285.5,
    details: 'Championship plaques & speaker gavel engraving',
    'time-created': new Date(2026, 8, 3).toISOString(),
  },
];

/**
 * Parses any Firestore timestamp, string, or number to a standard Date object.
 */
export function parseLedgerDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val === 'number') {
    return new Date(val);
  }
  return new Date();
}

/**
 * Formats date strictly into DD/MM/YYYY as requested.
 */
export function formatDDMMYYYY(val: unknown): string {
  const d = parseLedgerDate(val);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Fetch all records from the Ledger collection in Firestore, with client-side caching.
 */
export async function fetchAllLedgerRecords(forceRefresh = false): Promise<LedgerRecord[]> {
  if (!forceRefresh) {
    const cached = clientCache.get<LedgerRecord[]>(LEDGER_CACHE_KEY);
    if (cached && cached.length > 0) return cached;
  }

  if (!db || !isFirebaseConfigured()) {
    return FALLBACK_LEDGER_RECORDS;
  }

  try {
    const q = query(collection(db, 'Ledger'), orderBy('time-created', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Seed default items if collection is empty
      clientCache.set(LEDGER_CACHE_KEY, FALLBACK_LEDGER_RECORDS, 5 * 60 * 1000);
      return FALLBACK_LEDGER_RECORDS;
    }

    const records: LedgerRecord[] = snapshot.docs
      .filter((d) => d.id !== '_default' && !d.id.startsWith('_'))
      .map((docSnap) => {
        const data = docSnap.data();
        const amountVal = typeof data.amount === 'number' ? data.amount : undefined;
        // Accept both 'withdrawl' (specified) and 'withdrawal' defensively
        const rawWithdrawal = typeof data.withdrawl === 'number' ? data.withdrawl : data.withdrawal;
        const withdrawlVal = typeof rawWithdrawal === 'number' ? rawWithdrawal : undefined;

        return {
          id: docSnap.id,
          recipient: String(data.recipient || '').trim(),
          sender: String(data.sender || '').trim(),
          email: String(data.email || '').trim(),
          method: String(data.method || 'Other').trim(),
          amount: amountVal,
          withdrawl: withdrawlVal,
          details: String(data.details || '').trim(),
          'time-created': data['time-created'] || new Date().toISOString(),
          'time-updated': data['time-updated'] || data['time-created'],
        };
      });

    clientCache.set(LEDGER_CACHE_KEY, records, 5 * 60 * 1000);
    return records;
  } catch (err) {
    console.warn('Notice: Firestore Ledger read error, using local fallback:', err);
    return FALLBACK_LEDGER_RECORDS;
  }
}

/**
 * Generates the next sequential document ID for Ledger entries in the format DDMMYYYY-XXX.
 * Example: For a transaction on October 4, 2018 -> "04102018-001".
 * If multiple transactions occur on the same day, the 3-digit suffix increments (001, 002, ...).
 */
export async function generateNextLedgerDocId(dateInput?: unknown): Promise<string> {
  const d = parseLedgerDate(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const datePrefix = `${day}${month}${year}`;

  let maxSeq = 0;

  // 1. Query Firestore for existing documents with this datePrefix
  if (db && isFirebaseConfigured()) {
    try {
      const q = query(
        collection(db, 'Ledger'),
        where(documentId(), '>=', `${datePrefix}-000`),
        where(documentId(), '<=', `${datePrefix}-999`)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        const parts = id.split('-');
        if (parts.length === 2 && parts[0] === datePrefix) {
          const seq = parseInt(parts[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      });
    } catch (err) {
      console.warn('Notice: Could not query existing ledger IDs by range, checking cache fallback:', err);
    }
  }

  // 2. Also check cached records to ensure fast/offline consistency
  const cached = clientCache.get<LedgerRecord[]>(LEDGER_CACHE_KEY);
  if (cached && Array.isArray(cached)) {
    cached.forEach((rec) => {
      const parts = rec.id.split('-');
      if (parts.length === 2 && parts[0] === datePrefix) {
        const seq = parseInt(parts[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${datePrefix}-${nextSeq}`;
}

/**
 * Creates a new Ledger entry in Firestore.
 * Naming strictly enforces the DDMMYYYY-XXX convention.
 * Space-saving: only stores `amount` if deposit, and `withdrawl` if withdrawal.
 */
export async function createLedgerRecord(
  data: Omit<LedgerRecord, 'id' | 'time-created' | 'time-updated'> & {
    timeCreated?: string | Date;
  }
): Promise<string> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured.');
  }

  const cleanRecipient = data.recipient.trim();
  const cleanSender = data.sender.trim();
  const cleanEmail = data.email.trim();
  const cleanMethod = data.method.trim();
  const cleanDetails = data.details.trim();

  const recordDate = data.timeCreated
    ? (typeof data.timeCreated === 'string' ? new Date(data.timeCreated) : data.timeCreated)
    : new Date();

  const payload: Record<string, unknown> = {
    recipient: cleanRecipient,
    sender: cleanSender,
    email: cleanEmail,
    method: cleanMethod,
    details: cleanDetails,
    'time-created': data.timeCreated
      ? (typeof data.timeCreated === 'string' ? new Date(data.timeCreated) : data.timeCreated)
      : serverTimestamp(),
    'time-updated': serverTimestamp(),
  };

  // Only store amount if deposit, and only store withdrawl if withdrawal (save space)
  if (typeof data.amount === 'number' && data.amount > 0) {
    payload.amount = parseFloat(data.amount.toFixed(2));
  } else if (typeof data.withdrawl === 'number' && data.withdrawl > 0) {
    payload.withdrawl = parseFloat(data.withdrawl.toFixed(2));
  }

  // Generate strict DDMMYYYY-XXX document ID
  const docId = await generateNextLedgerDocId(recordDate);
  const docRef = doc(db, 'Ledger', docId);
  await setDoc(docRef, payload);

  clientCache.invalidate(LEDGER_CACHE_KEY);
  return docId;
}

/**
 * Updates an existing Ledger entry in Firestore.
 */
export async function updateLedgerRecord(
  id: string,
  updates: Partial<LedgerRecord> & { timeCreated?: string | Date }
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured.');
  }

  const payload: Record<string, unknown> = {
    'time-updated': serverTimestamp(),
  };

  if (updates.recipient !== undefined) payload.recipient = updates.recipient.trim();
  if (updates.sender !== undefined) payload.sender = updates.sender.trim();
  if (updates.email !== undefined) payload.email = updates.email.trim();
  if (updates.method !== undefined) payload.method = updates.method.trim();
  if (updates.details !== undefined) payload.details = updates.details.trim();

  if (updates.timeCreated) {
    payload['time-created'] =
      typeof updates.timeCreated === 'string' ? new Date(updates.timeCreated) : updates.timeCreated;
  }

  if (typeof updates.amount === 'number' && updates.amount > 0) {
    payload.amount = parseFloat(updates.amount.toFixed(2));
    payload.withdrawl = null; // Remove withdrawal if switched to deposit
  } else if (typeof updates.withdrawl === 'number' && updates.withdrawl > 0) {
    payload.withdrawl = parseFloat(updates.withdrawl.toFixed(2));
    payload.amount = null; // Remove deposit if switched to withdrawal
  }

  const docRef = doc(db, 'Ledger', id);
  await updateDoc(docRef, payload as { [x: string]: any });
  clientCache.invalidate(LEDGER_CACHE_KEY);
}

/**
 * Deletes a Ledger entry from Firestore.
 */
export async function deleteLedgerRecord(id: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    throw new Error('Firestore is not configured.');
  }

  const docRef = doc(db, 'Ledger', id);
  await deleteDoc(docRef);
  clientCache.invalidate(LEDGER_CACHE_KEY);
}

/**
 * Calculates current cash balance (total deposits minus total withdrawals from earliest to latest)
 * and generates timeline data points for the visualization chart.
 */
export function calculateCashBalanceTimeline(
  records: LedgerRecord[],
  timeframe: 'month' | '6months' | 'ytd' | 'all' = 'all'
): {
  currentBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  timeline: { date: Date; dateStr: string; runningBalance: number; delta: number; label: string }[];
  yAxisMax: number;
  yAxisTicks: number[];
} {
  // Sort records from earliest to latest
  const sorted = [...records].sort((a, b) => {
    const timeA = parseLedgerDate(a['time-created']).getTime();
    const timeB = parseLedgerDate(b['time-created']).getTime();
    return timeA - timeB;
  });

  let running = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;

  const allPoints: {
    date: Date;
    dateStr: string;
    runningBalance: number;
    delta: number;
    label: string;
  }[] = [];

  for (const r of sorted) {
    const deposit = typeof r.amount === 'number' ? r.amount : 0;
    const withdrawal = typeof r.withdrawl === 'number' ? r.withdrawl : 0;
    const delta = deposit - withdrawal;

    totalDeposits += deposit;
    totalWithdrawals += withdrawal;
    running += delta;

    const d = parseLedgerDate(r['time-created']);
    allPoints.push({
      date: d,
      dateStr: formatDDMMYYYY(d),
      runningBalance: Math.max(0, running),
      delta,
      label: r.details || (delta >= 0 ? `Deposit from ${r.sender}` : `Payment to ${r.recipient}`),
    });
  }

  const currentBalance = running;

  // Filter timeline according to timeframe
  const now = new Date();
  let filteredPoints = allPoints;

  if (timeframe === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredPoints = allPoints.filter((p) => p.date >= startOfMonth);
  } else if (timeframe === '6months') {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    filteredPoints = allPoints.filter((p) => p.date >= sixMonthsAgo);
  } else if (timeframe === 'ytd') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    filteredPoints = allPoints.filter((p) => p.date >= startOfYear);
  }

  // Determine Y-axis max and nice interval ticks (starting at 0)
  const maxVal = filteredPoints.reduce((max, p) => Math.max(max, p.runningBalance), currentBalance);
  const targetMax = Math.max(maxVal * 1.15, 1000);

  // Compute nice intervals (e.g. 500, 1000, 1500, 2000 or 250, 500, 750, 1000)
  let step = 500;
  if (targetMax <= 1500) step = 250;
  else if (targetMax <= 3000) step = 500;
  else if (targetMax <= 6000) step = 1000;
  else if (targetMax <= 15000) step = 2500;
  else step = 5000;

  const yAxisMax = Math.ceil(targetMax / step) * step;
  const yAxisTicks: number[] = [];
  for (let val = 0; val <= yAxisMax; val += step) {
    yAxisTicks.push(val);
  }

  return {
    currentBalance,
    totalDeposits,
    totalWithdrawals,
    timeline: filteredPoints,
    yAxisMax,
    yAxisTicks,
  };
}

/**
 * Checks if a newly recorded deposit in Ledger corresponds to any outstanding fee in Payments.
 * If deposit amount >= fee amount owed, automatically resolves the payment in Payments!
 */
export async function checkAndAutoResolveDeposit(deposit: {
  amount?: number;
  email?: string;
  sender?: string;
}): Promise<{ resolved: boolean; paymentName?: string; billId?: string; payer: string } | null> {
  if (!db || !isFirebaseConfigured()) return null;
  if (!deposit.amount || deposit.amount <= 0) return null;

  const targetEmail = (deposit.email || '').trim().toLowerCase();
  const targetSender = (deposit.sender || '').trim().toLowerCase();

  if (!targetEmail && !targetSender) return null;

  try {
    const paymentsSnap = await getDocs(collection(db, 'Payments'));
    if (paymentsSnap.empty) return null;

    for (const paymentDoc of paymentsSnap.docs) {
      if (paymentDoc.id === '_default' || paymentDoc.id.startsWith('_')) continue;

      const data = paymentDoc.data();
      const feeAmount = typeof data.amount === 'number' ? data.amount : 0;
      const incompleteUsers: string[] = (data.incomplete || []).map((e: string) =>
        String(e).toLowerCase().trim()
      );
      const incompleteInst: string[] = (data['incomplete-institution'] || []).map((i: string) =>
        String(i).toLowerCase().trim()
      );

      // Check if email is in incomplete
      const matchesEmail = targetEmail && incompleteUsers.includes(targetEmail);
      // Check if institution matches sender or email
      const matchesInstitution =
        (targetSender && incompleteInst.includes(targetSender)) ||
        (targetEmail && incompleteInst.includes(targetEmail));

      if ((matchesEmail || matchesInstitution) && deposit.amount >= feeAmount) {
        // Resolve payment!
        const matchedPayer = matchesEmail ? targetEmail : targetSender || targetEmail;
        const updates: Record<string, unknown> = {
          'time-updated': new Date().toISOString(),
        };

        if (matchesEmail) {
          updates.completed = arrayUnion(matchedPayer);
          updates.incomplete = arrayRemove(matchedPayer);
        } else {
          updates['completed-institution'] = arrayUnion(matchedPayer);
          updates['incomplete-institution'] = arrayRemove(matchedPayer);
        }

        await updateDoc(paymentDoc.ref, updates as { [x: string]: any });

        // If this is the membership dues bill, also sync user's isPaid in Users collection if user is eligible (isUCDS: true)
        if (paymentDoc.id.includes('membership-fee') && targetEmail) {
          try {
            const usersSnap = await getDocs(collection(db, 'Users'));
            for (const userDoc of usersSnap.docs) {
              const udata = userDoc.data();
              const matchesEmail =
                udata['email-preferred']?.toLowerCase() === targetEmail ||
                udata['email-login']?.toLowerCase() === targetEmail;

              if (matchesEmail && udata.isUCDS === true) {
                await updateDoc(userDoc.ref, {
                  isPaid: true,
                  'payment-verified-at': new Date().toISOString(),
                  'time-updated': serverTimestamp(),
                });
                break;
              }
            }
          } catch {
            // Non-critical background user sync
          }
        }

        clientCache.clear();

        return {
          resolved: true,
          paymentName: data.name || paymentDoc.id,
          billId: paymentDoc.id,
          payer: matchedPayer,
        };
      }
    }
  } catch (err) {
    console.warn('Auto-resolution check error:', err);
  }

  return null;
}

/**
 * Formats Ledger records into CSV string with columns in the exact specified order:
 * Recipient, Sender, Email, Method, Deposit ($ CAD), Withdrawal ($ CAD), Details, Date (DD/MM/YYYY)
 */
export function exportLedgerToCSV(records: LedgerRecord[]): string {
  const headers = [
    'Recipient',
    'Sender',
    'Email',
    'Method',
    'Deposit ($ CAD)',
    'Withdrawal ($ CAD)',
    'Details',
    'Date (DD/MM/YYYY)',
  ];

  const rows = records.map((r) => {
    const depositStr = typeof r.amount === 'number' ? r.amount.toFixed(2) : '';
    const withdrawlStr = typeof r.withdrawl === 'number' ? r.withdrawl.toFixed(2) : '';
    const dateStr = formatDDMMYYYY(r['time-created']);

    return [
      `"${(r.recipient || '').replace(/"/g, '""')}"`,
      `"${(r.sender || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.method || '').replace(/"/g, '""')}"`,
      depositStr,
      withdrawlStr,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      dateStr,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
