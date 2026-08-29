import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PayPalOrderDetails {
  userId: string;
  userEmail: string;
  userName: string;
  itemId: string;
  itemTitle: string;
  amountCad: number; // e.g. 25.00
}

/**
 * Loads the official PayPal JS SDK dynamically
 */
export function loadPayPalSdk(clientId: string, currency = 'CAD'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('paypal-sdk-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'paypal-sdk-script';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=${currency}&intent=capture&enable-funding=venmo,paylater`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);

    document.head.appendChild(script);
  });
}

import { recordBillPaymentCompletion } from './paymentsService';

/**
 * Handles post-capture payment verification in Firestore
 */
export async function recordPayPalPaymentSuccess(
  orderId: string,
  details: PayPalOrderDetails
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }

  const { userId, userEmail, userName, itemId, itemTitle, amountCad } = details;

  // 1. Update the bill in Payments collection (move email from incomplete to completed) & update Users isPaid
  await recordBillPaymentCompletion(itemId, userId, userEmail, 'paypal', orderId);

  // 2. Record transaction in society Payments ledger
  const paymentRef = doc(db, 'Payments', `PAYPAL_${orderId}`);
  await setDoc(paymentRef, {
    userId,
    userEmail,
    userName,
    itemId,
    itemTitle,
    amount: amountCad,
    currency: 'CAD',
    provider: 'paypal',
    orderId,
    status: 'completed',
    timestamp: serverTimestamp(),
  });
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => {
        render: (container: HTMLElement | string) => Promise<void>;
      };
    };
  }
}
