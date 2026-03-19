import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient, createAdminClient } from '@/lib/utils/auth';
import https from 'https';
import dns from 'dns';

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

    const { currency, addressId, couponCode, selectedItemIds } = await req.json();

    if (!addressId) {
      return NextResponse.json(
        { success: false, message: 'Address is required' },
        { status: 400 }
      );
    }

    // Secure Verification: Fetch Cart from DB
    let query = supabase
      .from('cart_items')
      .select(`
          id,
          quantity,
          product_id,
          variant_id,
          product:products(name, base_price),
          variant:product_variants(price_adjustment, stock)
        `)
      .eq('user_id', user.id);

    // If specific items are selected, only process those
    if (selectedItemIds && Array.isArray(selectedItemIds) && selectedItemIds.length > 0) {
      query = query.in('id', selectedItemIds);
    }

    const { data: cartItemsDB } = await query;

    if (!cartItemsDB || cartItemsDB.length === 0) {
      return NextResponse.json({ success: false, message: 'No selected items found in cart' }, { status: 400 });
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
        if (result.success && result.discountAmount !== undefined) {
          discountAmount = result.discountAmount;
        } else {
          throw new Error(result.message || 'Invalid coupon applied');
        }
      } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message || 'Failed to validate coupon' }, { status: 400 });
      }
    }

    // Strict NaN guard — prevents Razorpay from receiving NaN amounts
    const safeSubtotal = Number(subtotal) || 0;
    let safeDiscount = Number(discountAmount);
    if (isNaN(safeDiscount)) safeDiscount = 0;

    const total = Math.round(Math.max(0, safeSubtotal + shippingCost - safeDiscount));

    if (isNaN(total) || total < 1) {
      return NextResponse.json(
        { success: false, message: 'Order amount must be at least ₹1.00 for online payment.' },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, message: 'Payment gateway configuration is missing' },
        { status: 500 }
      );
    }

    // Node 18+ Undici `fetch` often crashes with "fetch failed" in local development 
    // due to IPv6 DNS loopbacks. We use `https` forcing IPv4 (`family: 4`) to bypass this.
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const orderPayload = JSON.stringify({
      amount: Math.round(total * 100),
      currency: currency || 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        user_id: user.id,
        address_id: String(addressId),
        coupon_code: couponCode ? String(couponCode) : '',
      },
    });

    // DNS Resilience: Manually resolve api.razorpay.com if system DNS fails (ENOTFOUND)
    const resolveHostname = async (hostname: string) => {
      try {
        const resolver = new dns.promises.Resolver();
        // Fallback to Google DNS if local DNS is broken
        resolver.setServers(['8.8.8.8', '1.1.1.1']);
        const addresses = await resolver.resolve4(hostname);
        return addresses[0];
      } catch (e) {
        console.error('DNS Resolution Fallback failed:', e);
        return hostname; // Fallback to original hostname and hope system DNS works
      }
    };

    const targetIp = await resolveHostname('api.razorpay.com');

    const razorpayData = await new Promise<any>((resolve, reject) => {
      const options = {
        hostname: targetIp,
        port: 443,
        path: '/v1/orders',
        method: 'POST',
        headers: {
          'Host': 'api.razorpay.com', // MUST set Host header when using IP
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(orderPayload),
        },
        family: 4 // Force IPv4 to prevent ECONNREFUSED / fetch failed on Windows
      };

      const request = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed?.error?.description || parsed?.error?.reason || 'Razorpay API returned an error'));
            }
          } catch (e) {
            reject(new Error('Razorpay response parse failed'));
          }
        });
      });

      request.on('error', (e) => reject(new Error(`Network error: ${e.message}`)));
      request.write(orderPayload);
      request.end();
    });

    // 6. DB Logging: Save Pending Payment with Snapshot
    const { error: paymentError } = await (adminSupabase
      .from('payments' as any)
      .insert({
        user_id: user.id,
        razorpay_order_id: razorpayData.id,
        amount: total,
        currency: razorpayData.currency || 'INR',
        status: 'pending',
        cart_snapshot: cartItemsDB.map((item: any) => ({
          id: item.id, // Added ID for partial checkout cleanup
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: (item.product.base_price || 0) + (item.variant.price_adjustment || 0)
        })),
        address_id: addressId,
        coupon_code: couponCode || null
      }) as any);

    if (paymentError) {
        console.error('Failed to log payment initiation:', paymentError);
        // We don't block the user since the RP order is created, but this is an issue for recovery.
    }

    return NextResponse.json({
      success: true,
      order: {
        id: razorpayData.id,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
      },
    });

  } catch (error: any) {
    console.error('SERVER API Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
