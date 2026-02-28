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
          variant:product_variants(price_adjustment, stock)
        `)
      .eq('user_id', user.id);

    if (!cartItemsDB || cartItemsDB.length === 0) {
      return NextResponse.json({ success: false, message: 'Cart is empty' }, { status: 400 });
    }

    const cartItems = cartItemsDB.map((item: any) => {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;

      if (variant.stock < item.quantity) {
        throw new Error(`Not enough stock for ${product?.name}. Only ${variant.stock} left.`);
      }

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

    // Razorpay requires minimum ₹1.00 (100 paise)
    if (total < 1) {
      return NextResponse.json(
        { success: false, message: 'Order amount must be at least ₹1.00 for online payment.' },
        { status: 400 }
      );
    }

    // Use strictly backend key if provided, otherwise fallback to public one
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, message: 'Payment gateway configuration is missing' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
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
    // Log the raw error for debugging in terminal
    console.error('RAZORPAY SDK ERROR:', error);

    // Handle structural errors from Razorpay SDK
    if (error.statusCode === 400 && error.error?.description) {
      return NextResponse.json(
        { success: false, message: `Razorpay: ${error.error.description}` },
        { status: 400 }
      );
    }

    // Intercept Razorpay SDK bug where it crashes with a TypeError on connection/parsing issues
    let errorMessage = error.message || 'Failed to create order';
    if (typeof errorMessage === 'string' && (errorMessage.includes("reading 'status'") || error.code === 'ECONNRESET')) {
      errorMessage = 'Payment gateway connection failed. Please check your internet or try again later.';
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
