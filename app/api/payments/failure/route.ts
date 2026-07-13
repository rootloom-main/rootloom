import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PaymentService } from '@/lib/payments/service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authSupabase = await createSSRClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const service = new PaymentService(createAdminClient() as any);
    const result = await service.recordFailure({
      providerOrderId: body.razorpay_order_id || body.providerOrderId,
      providerPaymentId: body.razorpay_payment_id || body.providerPaymentId || null,
      reason: body.reason || body.error?.reason || body.error?.description || 'payment_failed',
      userId: user.id,
    });

    return NextResponse.json({ success: true, orderId: result?.orderId || null });
  } catch (error) {
    console.error('[Payments][Failure] Failed to record payment failure', error);
    return NextResponse.json({ success: true, orderId: null });
  }
}
