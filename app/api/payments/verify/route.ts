import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaymentService } from '@/lib/payments/service';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await checkRateLimit(`payment-verify:${ip}`);
    if (!success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const authSupabase = await createSSRClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const service = new PaymentService(createAdminClient() as any);
    const order = await service.finalizePayment({
      providerOrderId: body.razorpay_order_id || body.providerOrderId,
      providerPaymentId: body.razorpay_payment_id || body.providerPaymentId,
      signature: body.razorpay_signature || body.signature,
      userId: user.id,
      source: 'browser',
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('[Payments][Verify] Failed to verify payment', error);
    return NextResponse.json(
      { success: false, message: 'Payment verification failed' },
      { status: 400 }
    );
  }
}
