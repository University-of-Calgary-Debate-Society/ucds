/**
 * Interac e-Transfer Automated Receipt Verification & Ledger Engine
 * University of Calgary Debate Society (UCDS)
 * 
 * Purpose:
 * Connects to the society inbox (ucds.debate@gmail.com receiving forwards from finance@ucds.ca),
 * filters autodeposit confirmation notices from TD Bank (notify@payments.interac.ca),
 * extracts transaction metadata and sender/student email, and automatically:
 * 1. Logs the transaction into the Cloud Firestore `Ledger` collection (storing only `amount`, no `withdrawl`, no `ucid`).
 * 2. Cross-checks `Users`: if registered student has `isUCDS: true`, marks `isPaid: true`.
 * 3. Cross-syncs `Payments`: resolves the member's outstanding fees by moving them from `incomplete` to `completed`.
 * 
 * Execution:
 * Runs via GitHub Actions Workflow (.github/workflows/verify-etransfers.yml) every 30 minutes
 * or manually via: node scripts/parseInteracReceipts.js
 */

import { initTimeSync } from './timeSync.js';
await initTimeSync();

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
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
  console.warn('Warning: No service-account.json found. Running in offline/preview mode.');
}

const app = getApps().length === 0 && serviceAccount ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

const db = app ? getFirestore(app) : null;

/**
 * Parses email text payload from TD Bank / Interac (notify@payments.interac.ca)
 */
export function extractInteracDetails(emailBody) {
  if (!emailBody) return null;

  // 1. Regex to extract CAD amount (e.g. $25.00)
  const amountMatch = emailBody.match(/\$(\d+(?:\.\d{2})?)\s*(?:CAD)?/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 25.0;

  // 2. Regex to extract Reference / Confirmation Number (e.g. Reference Number: CA12345678)
  const refMatch = emailBody.match(/(?:Reference\s*(?:Number|#)|Confirmation\s*#?)[:\s]*([A-Z0-9]+)/i);
  const referenceNumber = refMatch ? refMatch[1] : `INTERAC_${Date.now()}`;

  // 3. Extract sender name if available
  const senderMatch = emailBody.match(/(?:From|Sender|Name):\s*([A-Za-z\s.'-]+)(?:\r?\n|$)/i);
  let senderName = '';
  if (senderMatch && senderMatch[1]) {
    const rawName = senderMatch[1].trim();
    if (!rawName.toLowerCase().includes('bank') && !rawName.toLowerCase().includes('interac')) {
      senderName = rawName;
    }
  }

  // 4. Regex to extract user's email from Message/Memo/Sender field
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emailsFound = emailBody.match(emailRegex) || [];

  // Filter out system emails (interac.ca, ucds.ca, gmail.com, tdbank.com)
  const candidateUserEmails = emailsFound.filter(
    (e) =>
      !e.toLowerCase().includes('interac.ca') &&
      !e.toLowerCase().includes('finance@ucds.ca') &&
      !e.toLowerCase().includes('ucds.debate@gmail.com') &&
      !e.toLowerCase().includes('td.com') &&
      !e.toLowerCase().includes('tdbank.com')
  );

  const matchedEmail = candidateUserEmails.length > 0 ? candidateUserEmails[0].toLowerCase().trim() : '';

  return {
    amount,
    referenceNumber,
    userEmail: matchedEmail,
    senderName,
  };
}

/**
 * Matches an extracted payment with Firestore:
 * 1. Adds to Ledger collection (only `amount`, no `withdrawl`, no `ucid`)
 * 2. Checks Users collection: if isUCDS is true, updates isPaid = true
 * 3. Cross-syncs Payments collection (moves from incomplete to completed)
 */
export async function processInteracPayment(details) {
  const { userEmail, senderName, amount, referenceNumber, date } = details;

  if (!db) {
    console.warn('[Interac Parser] Firestore not initialized. Skipping cloud processing.');
    return false;
  }

  console.log(`[Interac Parser] Processing e-Transfer: Ref: ${referenceNumber}, Amount: $${amount} CAD, Email: "${userEmail || '(none)'}", Sender: "${senderName || '(unspecified)'}"`);

  let resolvedUserName = senderName || '';
  let matchedUserId = null;
  let userIsUCDS = false;

  // 1. Look up user in Users collection if email is present
  if (userEmail) {
    try {
      let userQuery = await db.collection('Users').where('email-login', '==', userEmail).limit(1).get();
      if (userQuery.empty) {
        userQuery = await db.collection('Users').where('email-preferred', '==', userEmail).limit(1).get();
      }

      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        matchedUserId = userDoc.id;
        const userData = userDoc.data();
        userIsUCDS = userData.isUCDS === true;
        const fullName = `${userData['name-first'] || ''} ${userData['name-last'] || ''}`.trim();
        if (fullName) resolvedUserName = fullName;

        // Auto-update isPaid if member is eligible (isUCDS is true)
        if (userIsUCDS) {
          await userDoc.ref.update({
            isPaid: true,
            'payment-provider': 'interac_etransfer',
            'payment-reference': referenceNumber,
            'payment-amount': amount,
            'payment-verified-at': FieldValue.serverTimestamp(),
            'time-updated': FieldValue.serverTimestamp(),
          });
          console.log(`[Interac Parser] ✓ Successfully updated isPaid = true for UCDS member ${userData.username || userEmail} (${matchedUserId}).`);
        } else {
          console.log(`[Interac Parser] Notice: Registered user ${userEmail} found, but isUCDS is false. isPaid was not set to true.`);
        }
      } else {
        console.log(`[Interac Parser] Notice: Associated email "${userEmail}" not found in registered Users collection.`);
      }
    } catch (err) {
      console.warn('[Interac Parser] Error querying or updating Users collection:', err.message);
    }
  }

  // 2. Write transaction to Ledger collection (Idempotent check by referenceNumber in details)
  try {
    const detailsString = `Interac e-Transfer Autodeposit (Ref: ${referenceNumber})`;
    const existingLedger = await db.collection('Ledger').where('details', '==', detailsString).limit(1).get();

    if (existingLedger.empty) {
      const transDate = date ? new Date(date) : new Date();
      const day = String(transDate.getDate()).padStart(2, '0');
      const month = String(transDate.getMonth() + 1).padStart(2, '0');
      const year = transDate.getFullYear();
      const prefix = `${day}${month}${year}`;

      // Query existing doc IDs for that day to get next sequence number
      const snap = await db.collection('Ledger')
        .where(FieldPath.documentId(), '>=', `${prefix}-000`)
        .where(FieldPath.documentId(), '<=', `${prefix}-999`)
        .get();

      let maxSeq = 0;
      snap.docs.forEach((d) => {
        const parts = d.id.split('-');
        if (parts.length === 2 && parts[0] === prefix) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      });

      const nextDocId = `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;

      const ledgerPayload = {
        recipient: 'UCDS',
        sender: resolvedUserName || senderName || userEmail || 'Interac Sender',
        email: userEmail || '',
        method: 'E-transfer',
        amount: parseFloat(amount.toFixed(2)),
        details: detailsString,
        'time-created': date ? new Date(date) : FieldValue.serverTimestamp(),
        'time-updated': FieldValue.serverTimestamp(),
      };

      await db.collection('Ledger').doc(nextDocId).set(ledgerPayload);
      console.log(`[Interac Parser] ✓ Added transaction to society Ledger (ID: ${nextDocId})! Only stored 'amount' ($${amount.toFixed(2)} CAD).`);
    } else {
      console.log(`[Interac Parser] Notice: Transaction Ref ${referenceNumber} already exists in Ledger. Skipped duplicate insertion.`);
    }
  } catch (err) {
    console.error('[Interac Parser] Error writing to Ledger:', err);
  }

  // 3. Cross-sync with Payments collection (Outstanding Fees tab)
  if (userEmail) {
    try {
      const paymentsSnap = await db.collection('Payments').get();
      for (const pDoc of paymentsSnap.docs) {
        if (pDoc.id === '_default' || pDoc.id.startsWith('_')) continue;
        const pData = pDoc.data();
        const incompleteList = pData.incomplete || [];

        const targetPayer = incompleteList.find(
          (e) => String(e).toLowerCase().trim() === userEmail.toLowerCase().trim()
        );

        if (targetPayer) {
          await pDoc.ref.update({
            incomplete: FieldValue.arrayRemove(targetPayer),
            completed: FieldValue.arrayUnion(targetPayer),
            'time-updated': FieldValue.serverTimestamp(),
          });
          console.log(`[Interac Parser] ✓ Synced Payments tab: resolved fee "${pData.name || pDoc.id}" for ${targetPayer}.`);
        }
      }
    } catch (err) {
      console.warn('[Interac Parser] Error cross-syncing Payments collection:', err.message);
    }
  }

  return true;
}

/**
 * IMAP client over TLS to poll unseen Interac emails from ucds.debate@gmail.com
 */
async function fetchAndProcessGmailReceipts(emailUser, appPassword) {
  return new Promise((resolve) => {
    console.log(`[IMAP] Connecting to imap.gmail.com:993 for ${emailUser}...`);
    
    const socket = tls.connect(
      {
        host: 'imap.gmail.com',
        port: 993,
        rejectUnauthorized: false,
        servername: 'imap.gmail.com',
      },
      () => {
        console.log('[IMAP] Connected over TLS. Authenticating...');
      }
    );

    let step = 'CONNECT';
    let buffer = '';
    let processedCount = 0;

    socket.setEncoding('utf8');

    const sendCmd = (tag, cmd) => {
      socket.write(`${tag} ${cmd}\r\n`);
    };

    socket.on('data', async (data) => {
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
        console.log('[IMAP] INBOX selected. Searching for unread Interac messages...');
        sendCmd('A03', 'SEARCH UNSEEN FROM "payments.interac.ca"');
      } else if (step === 'SEARCH' && buffer.includes('A03 OK')) {
        const searchLine = buffer.split('\r\n').find((l) => l.startsWith('* SEARCH'));
        buffer = '';
        const msgIds = searchLine ? searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean) : [];

        if (msgIds.length === 0) {
          console.log('[IMAP] No new unread Interac receipts found in INBOX.');
          step = 'LOGOUT';
          sendCmd('A05', 'LOGOUT');
          return;
        }

        console.log(`[IMAP] Found ${msgIds.length} unread receipt(s): [${msgIds.join(', ')}]. Fetching...`);
        step = 'FETCH';
        // Fetch bodies of unseen emails
        sendCmd('A04', `FETCH ${msgIds.join(',')} (BODY.PEEK[TEXT])`);
      } else if (step === 'FETCH' && buffer.includes('A04 OK')) {
        const rawContent = buffer;
        buffer = '';
        step = 'LOGOUT';

        // Parse individual message blocks
        const parts = rawContent.split(/\* \d+ FETCH/g);
        for (const part of parts) {
          if (!part.trim()) continue;
          const details = extractInteracDetails(part);
          if (details && details.referenceNumber) {
            await processInteracPayment(details);
            processedCount++;
          }
        }

        sendCmd('A05', 'LOGOUT');
      } else if (step === 'LOGOUT' && (buffer.includes('A05 OK') || buffer.includes('* BYE'))) {
        socket.end();
        console.log(`[IMAP] Completed session. Processed ${processedCount} receipts.`);
        resolve(processedCount);
      }
    });

    socket.on('error', (err) => {
      console.error('[IMAP] Socket error:', err.message);
      resolve(processedCount);
    });

    socket.setTimeout(25000, () => {
      console.warn('[IMAP] Socket timed out.');
      socket.destroy();
      resolve(processedCount);
    });
  });
}

// Script Entrypoint
async function run() {
  console.log('=====================================================');
  console.log('🏛️  UCDS Automated Interac e-Transfer Verification Engine');
  console.log('=====================================================');
  console.log('Monitored Society Inbox: ucds.debate@gmail.com');
  console.log('Origin: TD Bank Autodeposit (notify@payments.interac.ca)');

  const gmailUser = 'ucds.debate@gmail.com';
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;

  if (gmailPass) {
    console.log('[Runner] GMAIL_APP_PASSWORD detected. Connecting to Gmail IMAP server...');
    await fetchAndProcessGmailReceipts(gmailUser, gmailPass);
  } else {
    console.log('[Runner] GMAIL_APP_PASSWORD not set in environment.');
    console.log('[Runner] Running local verification test on sample TD Bank receipt...');

    const sampleEmailBody = `
      INTERAC e-Transfer: A transfer of $25.00 (CAD) has been deposited into your account.
      From: TD Bank Autodeposit
      Sender Name: John Doe
      Reference Number: CA987654321
      Sender Message / Memo: business.michaelwang@gmail.com
    `;

    const parsed = extractInteracDetails(sampleEmailBody);
    console.log('[Runner] Extracted details test:', parsed);

    if (db) {
      console.log('[Runner] Testing database synchronization logic...');
      await processInteracPayment(parsed);
    }
  }

  console.log('=====================================================');
  console.log('✓ Interac engine execution complete.');
  console.log('=====================================================');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Execution error:', err);
    process.exit(1);
  });

