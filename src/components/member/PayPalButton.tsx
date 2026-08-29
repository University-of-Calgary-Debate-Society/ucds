import React, { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk, recordPayPalPaymentSuccess, type PayPalOrderDetails } from '@/services/paypalService';
import { AlertCircle } from 'lucide-react';

interface PayPalButtonProps {
  orderDetails: PayPalOrderDetails;
  onSuccess: (orderId: string) => void;
  onError: (errorMessage: string) => void;
}

export const PayPalButton: React.FC<PayPalButtonProps> = ({
  orderDetails,
  onSuccess,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const clientId =
    import.meta.env.VITE_PAYPAL_CLIENT_ID ||
    'BAAhP6aJkOwE7oj1XSji61vZXYNPFATjDPMp7cyKTzw3Mxpwi3PdWU8mOW6VUxByhO1CkNHiwIPSCeMx-w';

  useEffect(() => {
    let isMounted = true;

    async function initPayPal() {
      try {
        setLoading(true);
        setSdkError(null);

        await loadPayPalSdk(clientId, 'CAD');

        if (!isMounted || !containerRef.current || !window.paypal) {
          return;
        }

        // Clear container before rendering
        containerRef.current.innerHTML = '';

        window.paypal
          .Buttons({
            style: {
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal',
              height: 44,
            },
            createOrder: (_data: unknown, actions: { order: { create: (spec: Record<string, unknown>) => Promise<string> } }) => {
              return actions.order.create({
                purchase_units: [
                  {
                    description: orderDetails.itemTitle,
                    custom_id: orderDetails.userId,
                    amount: {
                      currency_code: 'CAD',
                      value: orderDetails.amountCad.toFixed(2),
                    },
                  },
                ],
                application_context: {
                  brand_name: 'University of Calgary Debate Society',
                  shipping_preference: 'NO_SHIPPING',
                  user_action: 'PAY_NOW',
                },
              });
            },
            onApprove: async (_data: unknown, actions: { order: { capture: () => Promise<{ id: string; status: string }> } }) => {
              try {
                const captureResult = await actions.order.capture();
                const orderId = captureResult.id;

                await recordPayPalPaymentSuccess(orderId, orderDetails);
                onSuccess(orderId);
              } catch (err: unknown) {
                console.error('PayPal Capture Error:', err);
                const msg = err instanceof Error ? err.message : 'Payment capture failed.';
                onError(msg);
              }
            },
            onError: (err: unknown) => {
              console.error('PayPal SDK Error:', err);
              onError('An error occurred with PayPal checkout. Please try again.');
            },
            onCancel: () => {
              console.info('PayPal checkout cancelled by user.');
            },
          })
          .render(containerRef.current);

        setLoading(false);
      } catch (err: unknown) {
        console.error('Failed to load PayPal SDK:', err);
        if (isMounted) {
          setSdkError('Unable to load PayPal at this time. Please use Stripe or Interac e-Transfer.');
          setLoading(false);
        }
      }
    }

    initPayPal();

    return () => {
      isMounted = false;
    };
  }, [clientId, orderDetails, onSuccess, onError]);

  return (
    <div className="w-full space-y-2">
      {loading && (
        <div className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 animate-pulse">
          <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading PayPal Checkout...</span>
        </div>
      )}

      {sdkError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{sdkError}</span>
        </div>
      )}

      <div ref={containerRef} className="w-full min-h-[44px]" />
    </div>
  );
};
