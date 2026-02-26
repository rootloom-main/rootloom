import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createSSRClient } from '@/lib/utils/auth';
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { currency, addressId, couponCode } = await req.json();

    if (!addressId) {
      return NextResponse.json(
        { success: false, message: 'Address is required' },
        { status: 400 }
      );
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
      .eq('user_id', user.id);

    if (!cartItemsDB || cartItemsDB.length === 0) {
      return NextResponse.json({ success: false, message: 'Cart is empty' }, { status: 400 });
    }

    const cartItems = cartItemsDB.map((item: any) => {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;
      const price = product.base_price + (variant?.price_adjustment || 0);
      return { price, quantity: item.quantity };
    });

    const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const shippingCost = subtotal > 999 ? 0 : 50;

    let discountAmount = 0;
    if (couponCode) {
      try {
        const { validateCouponLogic } = await import('@/lib/coupon');
        const result = await validateCouponLogic(supabase, couponCode, subtotal);
        if (result.success) {
          discountAmount = result.discountAmount || 0;
        }
      } catch (e) {
        console.error('Create Order: Coupon validation failed', e);
      }
    }

    const total = Math.max(0, subtotal + shippingCost - discountAmount);

    if (total <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid order amount' },
        { status: 400 }
      );
    }

    if (!addressId) {
      return NextResponse.json(
        { success: false, message: 'Address is required' },
        { status: 400 }
      );
    }

    // Enterprise Phase 1: Atomically Reserve Stock
    const stockItems = cartItemsDB.map((item: any) => ({
      variant_id: item.variant_id,
      quantity: item.quantity
    }));

    const { error: reserveError } = await supabase.rpc('reserve_stock_batch', {
      items: stockItems
    });

    if (reserveError) {
      console.error('Stock Reservation Failed:', reserveError);
      return NextResponse.json(
        { success: false, message: 'Not enough stock available for one or more items in your cart.' },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: currency || 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        user_id: user.id,
        address_id: addressId,
        coupon_code: couponCode || '',
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
