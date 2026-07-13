export type PaymentProviderName = 'razorpay';

export type PaymentProviderOrder = {
  provider: PaymentProviderName;
  providerOrderId: string;
  amount: number;
  currency: string;
  receipt: string;
};

export type PaymentProviderCheckout = PaymentProviderOrder & {
  publicKey: string;
};

export type PaymentVerificationInput = {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
};

export type PaymentVerificationResult = {
  providerOrderId: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<PaymentProviderOrder>;
  verifyPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult>;
  verifyWebhook(rawBody: string, signature: string): boolean;
}

export type CheckoutItem = {
  id?: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  name: string;
};
