import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSSRClient, createAdminClient } from '@/lib/utils/auth';
import { processOrderCreation } from '@/lib/order-processing';
import { sendOrderConfirmationWhatsApp } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const adminSupabase = createAdminClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId: clientAddressId,
      address_id: backwardAddressId,
      couponCode,
    } = await req.json();

    // ── Signature Verification ─────────────────────────────────────────────
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return NextResponse.json(
        { success: false, message: 'Server configuration error: Key Secret missing' },
        { status: 500 }
      );
    }

    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ success: false, message: 'Invalid signature' }, { status: 400 });
    }

    // ── Idempotency Check ──────────────────────────────────────────────────
    const { data: existingOrder } = await adminSupabase
      .from('orders')
      .select('id, order_number')
      .eq('payment_id', razorpay_payment_id)
      .single() as { data: any | null };

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        message: 'Order already exists',
        orderId: existingOrder.id,
        orderNumber: existingOrder.order_number,
      });
    }

    // ── Fetch Payment Record (MUST be before using paymentRecord) ──────────
    const { data: paymentRecord } = await (adminSupabase
      .from('payments' as any)
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single() as any);

    if (!paymentRecord || !paymentRecord.cart_snapshot) {
      return NextResponse.json(
        { success: false, message: 'Payment record or snapshot missing' },
        { status: 400 }
      );
    }

    // ── Resolve Address ID ─────────────────────────────────────────────────
    const addressId: string = clientAddressId || backwardAddressId || paymentRecord.address_id;

    // ── Build Cart Items from Snapshot ─────────────────────────────────────
    const cartItems = paymentRecord.cart_snapshot.map((item: any) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price,
      name: 'Product',
    }));

    const subtotal: number =
      paymentRecord.subtotal ||
      cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const shippingCost: number = paymentRecord.shipping_cost || (subtotal > 999 ? 0 : 50);
    const discountAmount: number = paymentRecord.discount_amount || 0;
    const total: number = paymentRecord.amount;

    // ── Create Order ───────────────────────────────────────────────────────
    const { order, backgroundTasks } = await processOrderCreation({
      supabase: adminSupabase,
      userId: user.id,
      paymentId: razorpay_payment_id,
      amount: total,
      cartItems,
      addressId,
      discountAmount,
      couponCode: couponCode || paymentRecord.coupon_code || null,
      shippingCost,
      subtotal,
      userEmail: user.email!,
      userName: user.user_metadata?.full_name || 'Customer',
    });

    // ── Resolve WhatsApp Number (address phone → profile phone → metadata) ─
    let whatsappPhone: string | null = null;

    if (addressId) {
      const { data: addrData } = await (adminSupabase
        .from('addresses' as any)
        .select('phone')
        .eq('id', addressId)
        .single() as any);
      if (addrData?.phone) whatsappPhone = addrData.phone;
    }

    if (!whatsappPhone) {
      const { data: profileData } = await adminSupabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();
      if (profileData?.phone) whatsappPhone = profileData.phone;
    }

    if (!whatsappPhone) {
      whatsappPhone = user?.user_metadata?.phone || null;
    }

    // ── Clear Purchased Items from Cart ────────────────────────────────────
    const cartItemIds: string[] = paymentRecord.cart_snapshot.map((i: any) => i.id).filter(Boolean);
    if (cartItemIds.length > 0) {
      await (adminSupabase.from('cart_items' as any).delete().in('id', cartItemIds) as any);
    } else {
      await (adminSupabase.from('cart_items' as any).delete().eq('user_id', user.id) as any);
    }

    // ── Update Payment Status ──────────────────────────────────────────────
    await (adminSupabase
      .from('payments' as any)
      .update({ status: 'success', updated_at: new Date().toISOString() })
      .eq('razorpay_order_id', razorpay_order_id) as any);

    // ── DECOUPLED: Fire-and-forget (no await) ──────────────────────────────
    // Client is redirected immediately; this runs in the background.
    (async () => {
      try {
        const tasks: Promise<any>[] = [backgroundTasks];

        if (whatsappPhone) {
          // Fetch first product image for a richer WhatsApp message
          let productImageUrl: string | undefined;
          const firstItem = paymentRecord.cart_snapshot[0];
          if (firstItem?.product_id) {
            const { data: imgData } = await (adminSupabase
              .from('product_images' as any)
              .select('image_url')
              .eq('product_id', firstItem.product_id)
              .order('sort_order', { ascending: true })
              .limit(1)
              .single() as any);
            if (imgData?.image_url) productImageUrl = imgData.image_url;
          }

          console.log(
            `[WhatsApp] Sending to ${whatsappPhone} for #${order.order_number}` +
            (productImageUrl ? ' (with product image)' : ' (logo only)')
          );

          tasks.push(
            sendOrderConfirmationWhatsApp(
              whatsappPhone,
              user.user_metadata?.full_name || 'Customer',
              order.order_number,
              total.toFixed(2),
              false, // isCOD = false (Prepaid)
              productImageUrl
            )
          );
        } else {
          console.warn(`[WhatsApp] No phone found for user ${user.id} — notification skipped`);
        }

        await Promise.allSettled(tasks);
      } catch (e) {
        console.error('[WhatsApp] Post-payment background task error:', e);
      }
    })();

    // ── Return immediately ─────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      orderId: order.id,
      orderNumber: order.order_number,
    });

  } catch (error: any) {
    if (error.code === '23505') {
      // Postgres unique violation — webhook already created the order
      return NextResponse.json({ success: true, message: 'Order processed by webhook' });
    }
    console.error('[VerifyPayment] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
