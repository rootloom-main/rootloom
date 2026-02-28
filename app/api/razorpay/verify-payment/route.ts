import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSSRClient } from '@/lib/utils/auth';
import { processOrderCreation } from '@/lib/order-processing';
import { validateCouponLogic } from '@/lib/coupon';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSSRClient();
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
      address_id,
      subtotal: clientSubtotal,
      shipping_cost: clientShipping,
      total: clientTotal,
      couponCode,
    } = await req.json();

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
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Idempotency: Check if order exists
    const { data: existingOrder } = await supabase
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

    // Secure Verification: Fetch Cart from DB
    const { data: cartItemsDB } = await supabase
      .from('cart_items')
      .select(`
          quantity,
          product_id,
          variant_id,
          product:products(name, base_price),
          variant:product_variants(price_adjustment)
        `)
      .eq('user_id', user.id) as { data: any[] | null };

    if (!cartItemsDB || cartItemsDB.length === 0) {
      // Fallback or Error? 
      // If webhook ran and cleared cart, we would have hit 'existingOrder' check above.
      // If no existing order and no cart, something is wrong.
      return NextResponse.json({ success: false, message: 'Cart is empty or order already processed' }, { status: 400 });
    }

    const cartItems = cartItemsDB.map((item: any) => {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;
      const price = product.base_price + (variant?.price_adjustment || 0);
      return {
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        name: product.name,
        price: price
      };
    });

    const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const shippingCost = subtotal > 999 ? 0 : 50;

    let discountAmount = 0;
    if (couponCode) {
      try {
        const result = await validateCouponLogic(supabase, couponCode, subtotal);
        if (result.success) {
          discountAmount = result.discountAmount || 0;
          if (result.couponId) {
            await supabase.rpc('increment_coupon_usage', { coupon_id: result.couponId } as any);
          }
        }
      } catch (e) {
        console.error('Verify: Coupon validation failed', e);
      }
    }

    const total = Math.max(0, subtotal + shippingCost - discountAmount);

    // We can compare 'total' with 'clientTotal' or Razorpay order amount if needed.
    // For now, trusting our DB calculation is the secure way.

    const order = await processOrderCreation({
      supabase,
      userId: user.id,
      paymentId: razorpay_payment_id,
      amount: total,
      cartItems,
      addressId: address_id,
      discountAmount,
      couponCode: couponCode || null,
      shippingCost,
      subtotal,
      userEmail: user.email!,
      userName: user.user_metadata.full_name || 'Customer'
    });

    // Atomically deduct stock AFTER confirmed payment — this is the safe point
    // to commit stock changes since we know the payment is real.
    const stockItems = cartItems.map((item: any) => ({
      variant_id: item.variant_id,
      quantity: item.quantity
    }));

    const { error: stockError } = await supabase.rpc('reserve_stock_batch', {
      items: stockItems
    });

    if (stockError) {
      // Log the error but don't fail the order — payment is already captured.
      // In a production scenario, this should trigger a manual review alert.
      console.error('Stock deduction failed after payment:', stockError);
    }

    // Clear Cart
    await supabase.from('cart_items').delete().eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      orderId: order.id,
      orderNumber: order.order_number,
    });

  } catch (error: any) {
    if (error.code === '23505') { // Postgres Unique Violation
      // Race condition: Webhook inserted order just now
      return NextResponse.json({
        success: true,
        message: 'Order processed by webhook',
        // Ideally should fetch the order to return ID, but client can redirect to orders list
      });
    }
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
