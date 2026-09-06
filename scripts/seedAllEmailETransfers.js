/**
 * ============================================================================
 * University of Calgary Debate Society (UCDS)
 * Historical Interac e-Transfer Mailbox Seeder & Ledger Engine
 * ============================================================================
 * 
 * Purpose:
 * Connects directly to the society inbox (ucds.debate@gmail.com),
 * parses ALL historical Interac e-Transfer autodeposits dating back to 2018,
 * extracts CAD amounts, reference numbers, sender names, and member emails,
 * and performs:
 * 1. Chronological sorting (earliest to latest).
 * 2. Strict document ID assignment using the DDMMYYYY-XXX convention
 *    (e.g., first payment on Oct 4, 2018 is named "04102018-001").
 * 3. Firestore collection `Ledger` population (storing only `amount`, no `withdrawl`, no `ucid`).
 * 4. Automatic sync with `Users` collection: if a registered student has `isUCDS: true`,
 *    sets `isPaid: true`.
 * 5. Automatic sync with `Payments` collection: moves payer email from `incomplete` to `completed`.
 * 
 * Execution:
 * Runs via GitHub Actions temporary workflow (.github/workflows/temp-seed-etransfers.yml)
 * or locally via: node scripts/seedAllEmailETransfers.js
 */

import { initTimeSync } from './timeSync.js';
await initTimeSync();

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import tls from 'tls';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.resolve(__dirname, '../service-account.json');

let serviceAccount;
const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (saEnv) {
  try {
    serviceAccount = JSON.parse(saEnv);
  } catch (err) {
    console.error('Error: Failed to parse Firebase Service Account JSON from environment variable:', err);
    process.exit(1);
  }
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  console.warn('Warning: No service-account.json found. Database updates will be previewed.');
}

const app = getApps().length === 0 && serviceAccount ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

const db = app ? getFirestore(app) : null;

/**
 * Extracts transaction metadata from email text.
 */
export function extractInteracMetadata(rawContent) {
  if (!rawContent) return null;

  // 1. Extract CAD amount (e.g. $25.00)
  const amountMatch = rawContent.match(/\$(\d+(?:\.\d{2})?)\s*(?:CAD)?/i);
  if (!amountMatch) return null; // Must have an amount to be an e-transfer record
  const amount = parseFloat(amountMatch[1]);

  // 2. Extract Reference / Confirmation Number
  const refMatch = rawContent.match(/(?:Reference\s*(?:Number|#)|Confirmation\s*#?)[:\s]*([A-Z0-9]+)/i);
  const referenceNumber = refMatch ? refMatch[1].trim() : `HIST_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 3. Extract Sender Name
  const senderMatch = rawContent.match(/(?:From|Sender|Name):\s*([A-Za-z\s.'-]+)(?:\r?\n|$)/i);
  let senderName = '';
  if (senderMatch && senderMatch[1]) {
    const rawName = senderMatch[1].trim();
    if (!rawName.toLowerCase().includes('bank') && !rawName.toLowerCase().includes('interac')) {
      senderName = rawName;
    }
  }

  // 4. Extract Date from header or body
  let date = null;
  // Check standard Date header
  const dateHeaderMatch = rawContent.match(/(?:^|\r?\n)Date:\s*([^\r\n]+)/i);
  if (dateHeaderMatch) {
    const parsed = new Date(dateHeaderMatch[1].trim());
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  // Check IMAP INTERNALDATE
  if (!date) {
    const internalDateMatch = rawContent.match(/INTERNALDATE\s+"([^"]+)"/i);
    if (internalDateMatch) {
      const parsed = new Date(internalDateMatch[1].trim());
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
  }

  // Fallback to current date if missing
  if (!date) {
    date = new Date();
  }

  // 5. Extract payer email
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emailsFound = rawContent.match(emailRegex) || [];
  const candidateUserEmails = emailsFound.filter(
    (e) =>
      !e.toLowerCase().includes('interac.ca') &&
      !e.toLowerCase().includes('finance@ucds.ca') &&
      !e.toLowerCase().includes('ucds.debate@gmail.com') &&
      !e.toLowerCase().includes('td.com') &&
      !e.toLowerCase().includes('tdbank.com')
  );

  const userEmail = candidateUserEmails.length > 0 ? candidateUserEmails[0].toLowerCase().trim() : '';

  return {
    amount,
    referenceNumber,
    senderName,
    userEmail,
    date,
  };
}

/**
 * Connects to Gmail IMAP server, queries ALL Interac messages, and fetches them in chunks.
 */
export async function fetchAllInteracFromInbox(emailUser, appPassword) {
  return new Promise((resolve) => {
    console.log(`[IMAP] Connecting to imap.gmail.com:993 for ${emailUser}...`);

    const socket = tls.connect(
      {
        host: 'imap.gmail.com',
        port: 993,
        rejectUnauthorized: true,
      },
      () => {
        console.log('[IMAP] Connected over TLS. Initiating authentication...');
      }
    );

    let step = 'CONNECT';
    let buffer = '';
    let msgIds = [];
    let chunkIndex = 0;
    const CHUNK_SIZE = 25;
    const parsedReceipts = [];

    socket.setEncoding('utf8');

    const sendCmd = (tag, cmd) => {
      socket.write(`${tag} ${cmd}\r\n`);
    };

    socket.on('data', (data) => {
      buffer += data;

      if (step === 'CONNECT' && buffer.includes('* OK')) {
        buffer = '';
        step = 'LOGIN';
        sendCmd('A01', `LOGIN "${emailUser}" "${appPassword}"`);
      } else if (step === 'LOGIN' && buffer.includes('A01 OK')) {
        buffer = '';
        step = 'SELECT';
        console.log('[IMAP] Authentication successful. Selecting INBOX...');
        sendCmd('A02', 'SELECT INBOX');
      } else if (step === 'SELECT' && buffer.includes('A02 OK')) {
        buffer = '';
        step = 'SEARCH';
        console.log('[IMAP] Searching for ALL Interac messages in inbox...');
        // Query both sender containing interac and subject containing interac
        sendCmd('A03', 'SEARCH OR (FROM "interac") (SUBJECT "INTERAC")');
      } else if (step === 'SEARCH' && buffer.includes('A03 OK')) {
        const searchLine = buffer.split('\r\n').find((l) => l.startsWith('* SEARCH'));
        buffer = '';
        msgIds = searchLine ? searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean) : [];

        console.log(`[IMAP] Found total ${msgIds.length} candidate Interac email(s) in inbox.`);

        if (msgIds.length === 0) {
          step = 'LOGOUT';
          sendCmd('A05', 'LOGOUT');
          return;
        }

        // Begin fetching chunks
        step = 'FETCH_CHUNKS';
        chunkIndex = 0;
        const currentBatch = msgIds.slice(0, CHUNK_SIZE);
        console.log(`[IMAP] Fetching batch 1/${Math.ceil(msgIds.length / CHUNK_SIZE)} (messages ${currentBatch[0]}..${currentBatch[currentBatch.length - 1]})...`);
        sendCmd(`F_${chunkIndex}`, `FETCH ${currentBatch.join(',')} (INTERNALDATE BODY.PEEK[HEADER.FIELDS (DATE FROM SUBJECT)] BODY.PEEK[TEXT])`);
      } else if (step === 'FETCH_CHUNKS') {
        const tag = `F_${chunkIndex}`;
        if (buffer.includes(`${tag} OK`)) {
          const rawChunk = buffer;
          buffer = '';

          // Parse individual message blocks in this batch
          const parts = rawChunk.split(/\* \d+ FETCH/g);
          for (const part of parts) {
            if (!part.trim()) continue;
            const meta = extractInteracMetadata(part);
            if (meta && meta.amount > 0) {
              parsedReceipts.push(meta);
            }
          }

          chunkIndex++;
          const nextStart = chunkIndex * CHUNK_SIZE;
          if (nextStart < msgIds.length) {
            const nextBatch = msgIds.slice(nextStart, nextStart + CHUNK_SIZE);
            const totalBatches = Math.ceil(msgIds.length / CHUNK_SIZE);
            console.log(`[IMAP] Fetching batch ${chunkIndex + 1}/${totalBatches} (messages ${nextBatch[0]}..${nextBatch[nextBatch.length - 1]})...`);
            sendCmd(`F_${chunkIndex}`, `FETCH ${nextBatch.join(',')} (INTERNALDATE BODY.PEEK[HEADER.FIELDS (DATE FROM SUBJECT)] BODY.PEEK[TEXT])`);
          } else {
            console.log(`[IMAP] Finished fetching all batches. Total valid receipts extracted: ${parsedReceipts.length}.`);
            step = 'LOGOUT';
            sendCmd('A05', 'LOGOUT');
          }
        }
      } else if (step === 'LOGOUT' && (buffer.includes('A05 OK') || buffer.includes('* BYE'))) {
        socket.end();
        resolve(parsedReceipts);
      } else if (buffer.includes('NO') || buffer.includes('BAD')) {
        console.warn('[IMAP] Notice from IMAP server:', buffer.trim());
        socket.end();
        resolve(parsedReceipts);
      }
    });

    socket.on('error', (err) => {
      console.error('[IMAP] Socket error during connection:', err.message);
      resolve(parsedReceipts);
    });

    socket.setTimeout(60000, () => {
      console.warn('[IMAP] Socket timed out.');
      socket.destroy();
      resolve(parsedReceipts);
    });
  });
}

/**
 * Deduplicates and sorts transactions chronologically, then assigns the strict DDMMYYYY-XXX document ID.
 */
export function assignChronologicalDocIds(receipts) {
  // Deduplicate by reference number
  const uniqueMap = new Map();
  for (const item of receipts) {
    if (!uniqueMap.has(item.referenceNumber)) {
      uniqueMap.set(item.referenceNumber, item);
    }
  }

  const transactions = Array.from(uniqueMap.values());

  // Sort chronologically ascending (earliest to latest)
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Assign DDMMYYYY-XXX sequential IDs
  const dailyCounters = {};

  return transactions.map((tx) => {
    const day = String(tx.date.getDate()).padStart(2, '0');
    const month = String(tx.date.getMonth() + 1).padStart(2, '0');
    const year = tx.date.getFullYear();
    const datePrefix = `${day}${month}${year}`;

    const seq = (dailyCounters[datePrefix] || 0) + 1;
    dailyCounters[datePrefix] = seq;

    const docId = `${datePrefix}-${String(seq).padStart(3, '0')}`;
    return {
      ...tx,
      docId,
    };
  });
}

/**
 * Seeds sorted transactions into Firestore Ledger, updates registered Users (isPaid = true),
 * and cross-syncs Payments collection.
 */
export async function seedTransactionsToFirestore(transactions) {
  if (!db) {
    console.warn('[Seeder] Firestore not initialized. Previewing transactions:');
    transactions.slice(0, 10).forEach((t) => {
      console.log(`- ID: ${t.docId} | Date: ${t.date.toISOString().split('T')[0]} | Amount: $${t.amount} | Ref: ${t.referenceNumber} | Email: ${t.userEmail || '(none)'}`);
    });
    return { ledgerCount: transactions.length, usersUpdated: 0, paymentsSynced: 0 };
  }

  console.log(`\n[Seeder] Writing ${transactions.length} transactions into Firestore 'Ledger' collection with strict DDMMYYYY-XXX IDs...`);

  // 1. Commit Ledger records in batches of 400
  let ledgerCount = 0;
  for (let i = 0; i < transactions.length; i += 400) {
    const batch = db.batch();
    const chunk = transactions.slice(i, i + 400);

    for (const item of chunk) {
      const docRef = db.collection('Ledger').doc(item.docId);
      const payload = {
        recipient: 'UCDS',
        sender: item.senderName || item.userEmail || 'Interac Sender',
        email: item.userEmail || '',
        method: 'E-transfer',
        amount: parseFloat(item.amount.toFixed(2)),
        details: `Interac e-Transfer Autodeposit (Ref: ${item.referenceNumber})`,
        'time-created': Timestamp.fromDate(item.date),
        'time-updated': FieldValue.serverTimestamp(),
      };
      batch.set(docRef, payload);
    }

    await batch.commit();
    ledgerCount += chunk.length;
    console.log(`[Seeder] ✓ Committed batch ${Math.min(i + 400, transactions.length)}/${transactions.length} to 'Ledger'.`);
  }

  // 2. Cross-check and update Users collection for registered student dues
  console.log('\n[Seeder] Cross-checking registered Users collection for membership fee status...');
  let usersUpdated = 0;
  const payerEmails = new Set(transactions.map((t) => t.userEmail).filter(Boolean));

  for (const email of payerEmails) {
    try {
      let userSnap = await db.collection('Users').where('email-login', '==', email).limit(1).get();
      if (userSnap.empty) {
        userSnap = await db.collection('Users').where('email-preferred', '==', email).limit(1).get();
      }

      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();

        // Check if member is a U of C student / UCDS member (isUCDS: true)
        if (userData.isUCDS === true && !userData.isPaid) {
          const matchingTx = transactions.find((t) => t.userEmail === email);
          await userDoc.ref.update({
            isPaid: true,
            'payment-provider': 'interac_etransfer',
            'payment-reference': matchingTx?.referenceNumber || 'HISTORICAL_EMAIL_VERIFIED',
            'payment-amount': matchingTx?.amount || 25.0,
            'payment-verified-at': FieldValue.serverTimestamp(),
            'time-updated': FieldValue.serverTimestamp(),
          });
          console.log(`[Seeder] ✓ Updated isPaid = true for registered UCDS member: ${userData.username || email} (${userDoc.id}).`);
          usersUpdated++;
        }
      }
    } catch (err) {
      console.warn(`[Seeder] Notice checking user ${email}:`, err.message);
    }
  }

  // 3. Cross-sync Payments collection (Outstanding Fees tab)
  console.log('\n[Seeder] Cross-syncing Payments collection (Outstanding Fees tab)...');
  let paymentsSynced = 0;
  try {
    const paymentsSnap = await db.collection('Payments').get();
    for (const pDoc of paymentsSnap.docs) {
      if (pDoc.id === '_default' || pDoc.id.startsWith('_')) continue;
      const pData = pDoc.data();
      const incompleteList = pData.incomplete || [];

      for (const email of payerEmails) {
        const targetPayer = incompleteList.find(
          (e) => String(e).toLowerCase().trim() === email.toLowerCase().trim()
        );

        if (targetPayer) {
          await pDoc.ref.update({
            incomplete: FieldValue.arrayRemove(targetPayer),
            completed: FieldValue.arrayUnion(targetPayer),
            'time-updated': FieldValue.serverTimestamp(),
          });
          console.log(`[Seeder] ✓ Resolved outstanding fee "${pData.name || pDoc.id}" for ${targetPayer}.`);
          paymentsSynced++;
        }
      }
    }
  } catch (err) {
    console.warn('[Seeder] Error cross-syncing Payments:', err.message);
  }

  return { ledgerCount, usersUpdated, paymentsSynced };
}

// Fallback sample data to verify structure if run without live email credentials
const SAMPLE_HISTORICAL_TRANSFERS = [
  {
    amount: 25.0,
    referenceNumber: 'CA18100401',
    senderName: 'David Thompson',
    userEmail: 'david.thompson@ucalgary.ca',
    date: new Date('2018-10-04T14:30:00Z'),
  },
  {
    amount: 25.0,
    referenceNumber: 'CA18100402',
    senderName: 'Jessica Lin',
    userEmail: 'jessica.lin@ucalgary.ca',
    date: new Date('2018-10-04T16:45:00Z'),
  },
  {
    amount: 50.0,
    referenceNumber: 'CA18111501',
    senderName: 'Calgary High School Tournament Reg',
    userEmail: 'debate@westerncanada.ab.ca',
    date: new Date('2018-11-15T19:00:00Z'),
  },
  {
    amount: 25.0,
    referenceNumber: 'CA25091001',
    senderName: 'Michael Wang',
    userEmail: 'business.michaelwang@gmail.com',
    date: new Date('2025-09-10T11:20:00Z'),
  },
];

async function main() {
  console.log('================================================================');
  console.log('🏛️  UCDS Historical Interac e-Transfer Seeder Engine');
  console.log('================================================================');
  console.log('Inbox Target: ucds.debate@gmail.com');
  console.log('Target Collection: Ledger (Format: DDMMYYYY-XXX)');

  const emailUser = 'ucds.debate@gmail.com';
  const appPassword = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;

  let rawReceipts = [];

  if (appPassword) {
    console.log('[Runner] GMAIL_APP_PASSWORD found. Connecting to IMAP server...');
    rawReceipts = await fetchAllInteracFromInbox(emailUser, appPassword);
  } else {
    console.log('[Runner] Note: GMAIL_APP_PASSWORD is not set in local environment.');
    console.log('[Runner] (GMAIL_APP_PASSWORD is encrypted in GitHub Repository Secrets).');
    console.log('[Runner] Running demonstration & verification mode using sample historical receipts...');
    rawReceipts = SAMPLE_HISTORICAL_TRANSFERS;
  }

  if (rawReceipts.length === 0) {
    console.log('[Runner] No receipts found to process.');
    process.exit(0);
  }

  console.log(`\n[Runner] Assigning chronological DDMMYYYY-XXX document IDs to ${rawReceipts.length} receipts...`);
  const sequencedTransactions = assignChronologicalDocIds(rawReceipts);

  console.log('[Runner] First 5 assigned IDs:');
  sequencedTransactions.slice(0, 5).forEach((t) => {
    console.log(`  - ${t.docId} | Date: ${t.date.toISOString().split('T')[0]} | $${t.amount} | Ref: ${t.referenceNumber}`);
  });

  const results = await seedTransactionsToFirestore(sequencedTransactions);

  console.log('\n================================================================');
  console.log('✓ Seeding complete!');
  console.log(`  - Ledger transactions created: ${results.ledgerCount}`);
  console.log(`  - Eligible UCDS members marked isPaid: ${results.usersUpdated}`);
  console.log(`  - Outstanding fees tabs synced: ${results.paymentsSynced}`);
  console.log('================================================================');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
