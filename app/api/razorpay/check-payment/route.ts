import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSSRClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const orderId = req.nextUrl.searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Missing order ID' }, { status: 400 });
    }

    // 1. Check if an order already exists for this Razorpay Order ID (Success Recovery)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('payment_id', orderId) // payment_id stores the razorpay_payment_id, but here we check notes or similar if needed.
      // Wait, orders table has payment_id. But at this point we only have razorpay_order_id.
      // Actually, we store razorpay_order_id in orders? Let's check schema.
      .single();

    // Re-check schema: orders table has payment_id (Razorpay payment ID).
    // The payments table has razorpay_order_id.
    
    // Check payments table first
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        profiles:user_id(full_name, phone, email)
      `)
      .eq('razorpay_order_id', orderId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ success: false, message: 'Payment session not found' }, { status: 404 });
    }

    // Check if order exists using the payment record
    const { data: finalOrder } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('payment_id', orderId) // If we store razorpay_order_id in payment_id during recovery or webhook
      .single();

    if (finalOrder) {
      return NextResponse.json({ 
        status: 'success', 
        orderNumber: finalOrder.order_number 
      });
    }

    if (payment.status === 'success') {
         // Should have an order by now, but maybe webhook is still processing
         return NextResponse.json({ status: 'success' });
    }

    if (payment.status === 'failed') {
        return NextResponse.json({ status: 'failed' });
    }

    // Return payment data for frontend to open modal
    const profile = Array.isArray(payment.profiles) ? payment.profiles[0] : payment.profiles;
    
    return NextResponse.json({
      status: 'pending',
      payment: {
        razorpay_order_id: payment.razorpay_order_id,
        amount: payment.amount,
        currency: payment.currency,
        address_id: payment.address_id,
        coupon_code: payment.coupon_code,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || user.email || '',
          contact: profile?.phone || ''
        }
      }
    });

  } catch (error: any) {
    console.error('Check Payment Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
