import 'server-only';

import { RazorpayProvider } from '@/lib/payments/providers/razorpay';

export function getPaymentProvider() {
  return new RazorpayProvider();
}
