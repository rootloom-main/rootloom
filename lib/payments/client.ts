'use client';

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
  onPaymentFailed?: (response: any) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
      close: () => void;
    };
  }
}

let razorpaySdkPromise: Promise<void> | null = null;
const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-sdk';

export function loadRazorpaySdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be opened in a browser'));
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpaySdkPromise) {
    razorpaySdkPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
      existingScript?.remove();
      const script = document.createElement('script');

      const handleLoad = () => {
        if (window.Razorpay) {
          resolve();
          return;
        }
        razorpaySdkPromise = null;
        reject(new Error('Payment gateway loaded without initializing'));
      };
      const handleError = () => {
        script.remove();
        razorpaySdkPromise = null;
        reject(new Error('Unable to load payment gateway'));
      };

      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });

      script.id = RAZORPAY_SCRIPT_ID;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    });
  }

  return razorpaySdkPromise;
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions) {
  await loadRazorpaySdk();
  if (!window.Razorpay) {
    throw new Error('Payment gateway is unavailable');
  }

  const checkout = new window.Razorpay(options);
  if (options.onPaymentFailed) {
    checkout.on('payment.failed', options.onPaymentFailed);
  }
  checkout.open();
  return checkout;
}
