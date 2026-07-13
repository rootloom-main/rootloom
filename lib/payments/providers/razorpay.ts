import 'server-only';

import crypto from 'crypto';
import type {
  PaymentProvider,
  PaymentProviderOrder,
  PaymentVerificationInput,
  PaymentVerificationResult,
} from '@/lib/payments/types';

function getRazorpayKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured');
  }

  return { keyId, keySecret };
}

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay' as const;

  private readonly keyId: string;
  private readonly keySecret: string;

  constructor() {
    const keys = getRazorpayKeys();
    this.keyId = keys.keyId;
    this.keySecret = keys.keySecret;
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 15_000);

      try {
        const response = await fetch(`https://api.razorpay.com/v1${path}`, {
          ...init,
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => null);
        if (response.ok) {
          return payload as T;
        }

        const message =
          payload?.error?.description ||
          payload?.error?.reason ||
          payload?.message ||
          `Razorpay request failed with status ${response.status}`;

        console.error(`[RazorpayProvider] Attempt ${attempt} error: ${message}`);

        if (response.status < 500 || attempt === 3) {
          throw new Error(message);
        }

        lastError = new Error(message);
      } catch (error: any) {
        console.error(`[RazorpayProvider] Attempt ${attempt} failed: ${error.name} – ${error.message}`);
        lastError = error;
        if (attempt === 3 || (error instanceof Error && !['AbortError', 'TypeError'].includes(error.name))) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to connect to Razorpay');
  }

  async createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<PaymentProviderOrder> {
    const order = await this.request<{
      id: string;
      amount: number;
      currency: string;
      receipt?: string;
    }>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes || {},
        payment_capture: 1,
      }),
    });

    return {
      provider: this.name,
      providerOrderId: order.id,
      amount: Number(order.amount) / 100,
      currency: order.currency,
      receipt: order.receipt || input.receipt,
    };
  }

  async verifyPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult> {
    if (input.signature) {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${input.providerOrderId}|${input.providerPaymentId}`)
        .digest('hex');

      if (
        expectedSignature.length !== input.signature.length ||
        !crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(input.signature))
      ) {
        throw new Error('Invalid payment signature');
      }

      return {
        providerOrderId: input.providerOrderId,
        providerPaymentId: input.providerPaymentId,
        amount: -1, // Sentinel to skip amount check
        currency: 'INR',
        status: 'captured',
      };
    }

    const payment = await this.request<{
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
    }>(`/payments/${encodeURIComponent(input.providerPaymentId)}`);

    if (payment.order_id !== input.providerOrderId) {
      throw new Error('Payment order mismatch');
    }

    return {
      providerOrderId: input.providerOrderId,
      providerPaymentId: input.providerPaymentId,
      amount: Number(payment.amount) / 100,
      currency: payment.currency,
      status: payment.status,
    };
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  }

  getCheckoutPublicKey() {
    return this.keyId;
  }
}
