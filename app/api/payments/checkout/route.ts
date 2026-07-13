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
    const checkoutSource = body.checkoutSource === 'BUY_NOW' ? 'BUY_NOW' : 'CART';
    const service = new PaymentService(createAdminClient() as any);
    const checkout = await service.startCheckout({
      user,
      addressId: body.addressId,
      selectedItemIds: Array.isArray(body.selectedItemIds) ? body.selectedItemIds : undefined,
      couponCode: body.couponCode || undefined,
      orderId: body.orderId || undefined,
      checkoutSource,
      buyNowItem: checkoutSource === 'BUY_NOW' ? body.buyNowItem : undefined,
    });

    return NextResponse.json({ success: true, checkout });
  } catch (error: any) {
    console.error('[Payments][Checkout] Failed to start checkout', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Unable to start payment' },
      { status: 400 }
    );
  }
}
