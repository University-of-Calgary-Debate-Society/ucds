import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface StripeCheckoutOptions {
  userId: string;
  userEmail: string;
  userName: string;
  membershipYear?: string;
  priceAmountCents?: number; // e.g. 2500 for $25.00 CAD
}

/**
 * Initiates a Stripe Checkout session for UCDS Society Membership Dues.
 * 
 * Supports both custom Stripe Payment Links and dynamic Checkout Sessions.
 */
export async function redirectToStripeCheckout(options: StripeCheckoutOptions): Promise<void> {
  const { userId, userEmail, userName } = options;

  // Retrieve Stripe Payment Link from env or use default society link
  const stripePaymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK || '';

  if (stripePaymentLink) {
    // Append client_reference_id and prefilled email so Stripe Webhooks can auto-verify
    const checkoutUrl = new URL(stripePaymentLink);
    checkoutUrl.searchParams.set('client_reference_id', userId);
    checkoutUrl.searchParams.set('prefilled_email', userEmail);
    checkoutUrl.searchParams.set('utm_source', 'ucds_portal');
    checkoutUrl.searchParams.set('utm_medium', userName);
    window.location.href = checkoutUrl.toString();
    return;
  }

  // Fallback: If no direct payment link is configured in .env, simulate or notify user
  console.info('Stripe Payment Triggered for UID:', userId, 'Email:', userEmail);
  alert(
    `Stripe Checkout Simulator:\n\nIn production, this redirects to Stripe Checkout with client_reference_id="${userId}".\nTo configure, set VITE_STRIPE_PAYMENT_LINK in your environment.`
  );
}

/**
 * Manually verifies or marks a user's dues as paid in Firestore (e.g. for testing or admin overrides).
 */
export async function markUserDuesPaid(userId: string): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }
  const userRef = doc(db, 'Users', userId);
  await updateDoc(userRef, {
    isPaid: true,
    'payment-verified-at': new Date().toISOString(),
  });
}
