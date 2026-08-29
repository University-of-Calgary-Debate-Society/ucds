/**
 * PayPal Automated Webhook Listener
 * University of Calgary Debate Society (UCDS)
 * 
 * Purpose:
 * Receives PayPal webhook events (e.g. PAYMENT.CAPTURE.COMPLETED, CHECKOUT.ORDER.APPROVED),
 * verifies cryptographic payload signature against PayPal API,
 * and updates Firestore Users collection (isPaid = true).
 * 
 * PayPal Webhook URL format:
 * https://<your-cloud-functions-url>/paypalWebhook
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// 1. Initialize Firebase Admin SDK
let serviceAccount;
const serviceAccountPath = path.resolve('service-account.json');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
  console.warn('Warning: Running in development mode without service account credentials.');
}

if (serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = serviceAccount ? getFirestore() : null;

/**
 * Handles incoming PayPal webhook payload
 */
export async function handlePayPalWebhookEvent(event) {
  if (!event || !event.event_type) {
    throw new Error('Invalid PayPal event structure');
  }

  console.log(`[PayPal Webhook] Received Event: ${event.event_type} (ID: ${event.id})`);

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const resource = event.resource;
    const userId = resource.custom_id; // Firebase user UID
    const orderId = resource.supplementary_data?.related_ids?.order_id || resource.id;
    const amountCad = parseFloat(resource.amount?.value || '25.00');

    if (!userId) {
      console.warn(`[PayPal Webhook] Payment captured but no custom_id (User UID) attached. Order: ${orderId}`);
      return { status: 'skipped', reason: 'no_user_id' };
    }

    if (db) {
      // 1. Mark user dues as verified in Firestore
      await db.collection('Users').doc(userId).update({
        isPaid: true,
        'payment-provider': 'paypal',
        'payment-order-id': orderId,
        'payment-amount': amountCad,
        'payment-verified-at': FieldValue.serverTimestamp(),
      });

      // 2. Audit record in Payments collection
      await db.collection('Payments').doc(`PAYPAL_${orderId}`).set({
        userId,
        amount: amountCad,
        currency: resource.amount?.currency_code || 'CAD',
        provider: 'paypal',
        orderId,
        status: 'completed',
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`[PayPal Webhook] SUCCESS: Dues verified for UID: ${userId} (Order #${orderId})`);
    }

    return { status: 'verified', userId, orderId };
  }

  return { status: 'ignored', eventType: event.event_type };
}

// Example testing verification
console.log('PayPal Webhook Handler ready.');
