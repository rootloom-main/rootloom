import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { validateCouponLogic } from '@/lib/coupon';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
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
      cartItems,
      address_id,
      subtotal,
      shipping_cost,
      total,
      couponCode, // Receive coupon code
    } = await req.json();

    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Validate Coupon/Discount if provided
    let discountAmount = 0;
    let validCouponCode = null;

    if (couponCode) {
      const couponResult = await validateCouponLogic(supabase, couponCode, subtotal);
      if (couponResult.success) {
        discountAmount = couponResult.discountAmount || 0;
        validCouponCode = couponCode;

        // Increment Usage
        if (couponResult.couponId) {
          await supabase.rpc('increment_coupon_usage', { coupon_id: couponResult.couponId });
        }
      }
    }

    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: 'processing',
        payment_status: 'completed',
        payment_id: razorpay_payment_id,
        subtotal,
        shipping_cost,
        total,
        discount_amount: discountAmount,
        coupon_code: validCouponCode,
        shipping_address_id: address_id,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    const orderItems = cartItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      throw itemsError;
    }


    // Verify Stock Updates
    for (const item of cartItems) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock, size, color, product:products(id, name)')
        .eq('id', item.variant_id)
        .single();

      if (variant) {
        const newStock = variant.stock - item.quantity;

        await supabase
          .from('product_variants')
          .update({ stock: newStock })
          .eq('id', item.variant_id);

        if (newStock < 5) {
          // Import dynamically or use the imported function
          const { sendInventoryAlertEmail } = await import('@/lib/email-alerts');

          // Handle potential array response from Supabase join
          const productData: any = Array.isArray(variant.product)
            ? variant.product[0]
            : variant.product;

          await sendInventoryAlertEmail({
            productName: productData?.name || 'Unknown Product',
            variant: `Size: ${variant.size}, Color: ${variant.color}`,
            remainingStock: newStock,
            productId: productData?.id
          });
        }
      }
    }


    // Send Confirmation Email
    try {
      // Fetch product details for email names
      const productIds = cartItems.map((item: any) => item.product_id);
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      const emailItems = cartItems.map((item: any) => {
        const product = products?.find((p) => p.id === item.product_id);
        return {
          name: product?.name || 'Create',
          quantity: item.quantity,
          price: (item.price * item.quantity).toFixed(2), // Format as needed
        };
      });

      await sendOrderConfirmationEmail({
        orderNumber: order.order_number,
        customerName: user.user_metadata.full_name || 'Customer',
        customerEmail: user.email || '',
        totalAmount: total.toFixed(2),
        items: emailItems,
      });
    } catch (emailError) {
      // Don't fail the request if email fails, just log it
      console.error('Failed to send confirmation email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
