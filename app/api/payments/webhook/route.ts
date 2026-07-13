import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaymentService } from '@/lib/payments/service';
import { getPaymentProvider } from '@/lib/payments/providers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const provider = getPaymentProvider();

    if (!provider.verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const paymentEntity = event?.payload?.payment?.entity;
    const providerOrderId = paymentEntity?.order_id || event?.payload?.order?.entity?.id;

    if (!providerOrderId) {
      return NextResponse.json({ success: true });
    }

    const service = new PaymentService(createAdminClient() as any);

    if (['payment.captured', 'order.paid'].includes(event.event) && paymentEntity?.id) {
      await service.finalizePayment({
        providerOrderId,
        providerPaymentId: paymentEntity.id,
        signature: '',
        source: 'webhook',
      });
    } else if (String(event.event || '').startsWith('payment.failed')) {
      await service.recordFailure({
        providerOrderId,
        providerPaymentId: paymentEntity?.id || null,
        reason: paymentEntity?.error_description || 'webhook_payment_failed',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Payments][Webhook] Processing failed', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
