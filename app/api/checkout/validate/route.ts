import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
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

    const { couponCode, addressId } = await req.json();

    // 1. Fetch Cart from DB
    const { data: cartItemsDB, error: cartError } = await supabase
      .from('cart_items')
      .select(`
          quantity,
          product_id,
          variant_id,
          product:products(name, base_price),
          variant:product_variants(price_adjustment, stock)
        `)
      .eq('user_id', user.id);

    if (cartError || !cartItemsDB || cartItemsDB.length === 0) {
      return NextResponse.json({ success: false, message: 'Cart is empty' }, { status: 400 });
    }

    // 2. Validate Stock and Calculate Subtotal
    let subtotal = 0;
    const items = [];

    for (const item of cartItemsDB) {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;

      if (!variant || variant.stock < item.quantity) {
        return NextResponse.json({ 
          success: false, 
          message: `Not enough stock for ${product?.name || 'item'}. Only ${variant?.stock || 0} left.` 
        }, { status: 400 });
      }

      const price = (product?.base_price || 0) + (variant?.price_adjustment || 0);
      subtotal += price * item.quantity;
      items.push({
        name: product.name,
        quantity: item.quantity,
        price: price,
        variant_id: item.variant_id
      });
    }

    // 3. Shipping Calculation
    const shippingCost = subtotal > 999 ? 0 : 50;

    // 4. Coupon Validation
    let discountAmount = 0;
    if (couponCode) {
      const couponResult = await validateCouponLogic(supabase, couponCode, subtotal);
      if (couponResult.success) {
        discountAmount = couponResult.discountAmount || 0;
      } else {
        return NextResponse.json({ success: false, message: couponResult.message }, { status: 400 });
      }
    }

    // 5. Address Validation
    if (addressId) {
        const { data: address, error: addressError } = await supabase
            .from('addresses')
            .select('id')
            .eq('id', addressId)
            .eq('user_id', user.id)
            .single();
            
        if (addressError || !address) {
            return NextResponse.json({ success: false, message: 'Invalid delivery address' }, { status: 400 });
        }
    }

    const total = Math.round(Math.max(0, subtotal + shippingCost - discountAmount));

    return NextResponse.json({
      success: true,
      data: {
        subtotal,
        shippingCost,
        discountAmount,
        total,
        itemCount: items.length,
        items
      }
    });

  } catch (error: any) {
    console.error('Validation Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Validation failed' }, { status: 500 });
  }
}
