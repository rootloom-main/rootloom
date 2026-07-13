import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderConfirmationWhatsApp } from '@/lib/whatsapp';
import { validateCouponLogic } from '@/lib/coupon';
import { processOrderCreation } from '@/lib/order-processing';
import { getMarketingAttribution } from '@/lib/marketing-attribution';
import { recordOpsEvent } from '@/lib/ops-events';

export const runtime = 'nodejs';

type BuyNowItem = {
    productId: string;
    variantId: string;
    quantity: number;
    price?: number;
    name?: string;
};

function normalizeBuyNowItem(item: BuyNowItem | undefined): BuyNowItem {
    if (!item || typeof item !== 'object') {
        throw new Error('Buy Now item is required');
    }

    const quantity = Number(item.quantity);
    if (!item.productId || !item.variantId || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Invalid Buy Now item');
    }

    return {
        ...item,
        quantity,
    };
}

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

        const { addressId, couponCode, selectedItemIds, orderId = null, checkoutSource: rawCheckoutSource, buyNowItem: rawBuyNowItem } = await req.json();
        const checkoutSource = rawCheckoutSource === 'BUY_NOW' ? 'BUY_NOW' : 'CART';
        const buyNowItem = checkoutSource === 'BUY_NOW' ? normalizeBuyNowItem(rawBuyNowItem) : undefined;

        // ─── Retry existing order via COD ──────────────────────────────────
        if (orderId) {
            const { data: order, error: orderError } = await adminSupabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .eq('user_id', user.id)
                .single();

            if (orderError || !order) {
                return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
            }

            if (order.payment_status === 'completed') {
                return NextResponse.json({ success: false, message: 'This order has already been paid.' }, { status: 400 });
            }

            if (order.status === 'cancelled') {
                return NextResponse.json({ success: false, message: 'This order has been cancelled.' }, { status: 400 });
            }

            const codPaymentId = `COD_${Date.now()}_${user.id.slice(0, 8)}`;
            await adminSupabase
                .from('orders')
                .update({
                    status: 'processing',
                    payment_status: 'pending',
                    payment_id: codPaymentId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            await recordOpsEvent({
                eventType: 'payment.cod_retry',
                status: 'success',
                userId: user.id,
                orderId,
                paymentId: codPaymentId,
            });

            return NextResponse.json({
                success: true,
                message: 'Order placed successfully',
                orderId: order.id,
                orderNumber: order.order_number,
            });
        }

        // ─── New order ────────────────────────────────────────────────────
        if (!addressId) {
            return NextResponse.json({ success: false, message: 'Address is required' }, { status: 400 });
        }

        const { data: address, error: addressError } = await supabase
            .from('addresses')
            .select('id')
            .eq('id', addressId)
            .eq('user_id', user.id)
            .single();

        if (addressError || !address) {
            return NextResponse.json({ success: false, message: 'Shipping address not found' }, { status: 404 });
        }

        let userPhone = user.user_metadata?.phone;
        if (!userPhone) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('phone')
                .eq('id', user.id)
                .single();
            userPhone = profile?.phone || null;
        }

        let cartItems: Array<{ id?: string; product_id: string; variant_id: string; quantity: number; price: number; name: string }> = [];

        // ─── BUY NOW: Load directly from product_variants ─────────────────
        if (checkoutSource === 'BUY_NOW') {
            const item = buyNowItem!;
            const { data: variant, error: variantError } = await adminSupabase
                .from('product_variants')
                .select('id, price_adjustment, stock, reserved_quantity, product:products!inner(id, name, base_price)')
                .eq('id', item.variantId)
                .is('products.deleted_at', null)
                .single() as any;

            if (variantError || !variant) {
                return NextResponse.json({ success: false, message: 'Product not available' }, { status: 400 });
            }

            const product = Array.isArray(variant.product) ? variant.product[0] : variant.product;
            if ((product as any)?.id !== item.productId) {
                return NextResponse.json({ success: false, message: 'Buy Now item does not match the selected product' }, { status: 400 });
            }

            const availableStock = Number((variant as any).stock || 0) - Number((variant as any).reserved_quantity || 0);

            if (availableStock < item.quantity) {
                return NextResponse.json({ success: false, message: `Not enough stock. Only ${availableStock} left.` }, { status: 400 });
            }

            const price = Number((product as any)?.base_price || 0) + Number((variant as any).price_adjustment || 0);
            cartItems = [{
                product_id: (product as any).id,
                variant_id: item.variantId,
                quantity: item.quantity,
                price,
                name: (product as any)?.name || item.name || 'Product',
            }];
        } else {
            // ─── CART: Load selected cart items ───────────────────────────
            let query = supabase
                .from('cart_items')
                .select(`
                    id,
                    quantity,
                    product_id,
                    variant_id,
                    product:products!inner(name, base_price),
                    variant:product_variants!inner(price_adjustment, stock, reserved_quantity)
                `)
                .eq('user_id', user.id)
                .is('products.deleted_at', null);

            if (selectedItemIds && Array.isArray(selectedItemIds) && selectedItemIds.length > 0) {
                query = query.in('id', selectedItemIds);
            }

            const { data: cartItemsDB } = await query;

            if (!cartItemsDB || cartItemsDB.length === 0) {
                return NextResponse.json({ success: false, message: 'No selected items found in cart' }, { status: 400 });
            }

            cartItems = cartItemsDB.map((item: any) => {
                const product = Array.isArray(item.product) ? item.product[0] : item.product;
                const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;
                const availableStock = Number(variant?.stock || 0) - Number(variant?.reserved_quantity || 0);

                if (availableStock < item.quantity) {
                    throw new Error(`Not enough stock for ${product?.name}. Only ${availableStock} left.`);
                }

                const price = product.base_price + (variant?.price_adjustment || 0);
                return {
                    id: item.id,
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    price,
                    name: product?.name || 'Product',
                };
            });
        }

        const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const shippingCost = subtotal > 999 ? 0 : 50;

        let discountAmount = 0;
        let validCouponCode: string | null = null;

        if (couponCode) {
            const couponResult = await validateCouponLogic(supabase as any, couponCode, subtotal, { userId: user.id });
            if (!couponResult.success) {
                return NextResponse.json({ success: false, message: couponResult.message }, { status: 400 });
            }

            discountAmount = couponResult.discountAmount || 0;
            validCouponCode = couponResult.couponCode || couponCode;
        }

        const total = Math.max(0, subtotal + shippingCost - discountAmount);
        const codPaymentId = `COD_${Date.now()}_${user.id.slice(0, 8)}`;
        const attribution = await getMarketingAttribution();

        const cartItemIds = cartItems.map((item: any) => item.id).filter(Boolean);
        const { order, backgroundTasks } = await processOrderCreation({
            supabase: adminSupabase as any,
            userId: user.id,
            paymentId: codPaymentId,
            amount: total,
            cartItems,
            addressId,
            discountAmount,
            couponCode: validCouponCode,
            shippingCost,
            subtotal,
            userEmail: user.email || '',
            userName: user.user_metadata?.full_name || 'Customer',
            orderStatus: 'processing',
            paymentStatus: 'pending',
            requireReservation: false,
            cartItemIds,
            cleanupPurchasedCartItems: true,
        });

        backgroundTasks.catch((error) => {
            console.error('COD background tasks failed:', error);
        });

        if (userPhone) {
            sendOrderConfirmationWhatsApp(
                userPhone,
                user.user_metadata?.full_name || 'Customer',
                order.order_number,
                total.toFixed(2),
                true
            ).catch((error) => console.error('Failed to send COD WhatsApp:', error));
        }

        recordOpsEvent({
            eventType: 'payment.cod',
            status: 'success',
            userId: user.id,
            orderId: order.id,
            paymentId: codPaymentId,
            metadata: {
                coupon_code: validCouponCode,
                attribution,
                checkout_source: checkoutSource || 'CART',
            },
        }).catch((error) => console.error('Failed to record COD ops event:', error));

        return NextResponse.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order.id,
            orderNumber: order.order_number,
        });
    } catch (error: any) {
        console.error('Error creating COD order:', error);
        recordOpsEvent({
            eventType: 'payment.cod',
            status: 'failed',
            metadata: { message: error.message || 'cod_failed' },
        }).catch((opsError) => console.error('Failed to record COD failure ops event:', opsError));
        return NextResponse.json(
            { success: false, message: error.message || 'Order creation failed' },
            { status: 500 }
        );
    }
}
