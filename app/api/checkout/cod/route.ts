import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { validateCouponLogic } from '@/lib/coupon';
import { sendOrderConfirmationWhatsApp } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSSRClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        let userPhone = user?.user_metadata?.phone;

        // If not in metadata, fetch from profiles
        if (user && !userPhone) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('phone')
                .eq('id', user.id)
                .single();
            if (profile?.phone) {
                userPhone = profile.phone;
            }
        }

        if (!user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const {
            addressId,
            couponCode,
            selectedItemIds, // Added for partial checkout
        } = await req.json();

        const address_id = addressId; // Maintain internal name for insertion

        // Secure Verification: Fetch Cart from DB
        let query = supabase
            .from('cart_items')
            .select(`
                id,
                quantity,
                product_id,
                variant_id,
                product:products(name, base_price),
                variant:product_variants(price_adjustment)
            `)
            .eq('user_id', user.id);

        // If specific items are selected, only fetch/process those
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
            const price = product.base_price + (variant?.price_adjustment || 0);
            return {
                id: item.id, // Keep cart item ID for deletion
                product_id: item.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                price
            };
        });

        const subtotal = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const shippingCost = subtotal > 999 ? 0 : 50;

        // Validate Coupon if provided
        let discountAmount = 0;
        let validCouponCode = null;

        if (couponCode) {
            const couponResult = await validateCouponLogic(supabase, couponCode, subtotal);
            if (couponResult.success) {
                discountAmount = couponResult.discountAmount || 0;
                validCouponCode = couponCode;

                // Increment Usage
                if (couponResult.couponId) {
                    await supabase.rpc('increment_coupon_usage', { coupon_id: couponResult.couponId } as any);
                }
            }
        }

        const total = Math.max(0, subtotal + shippingCost - discountAmount);

        // Enterprise Phase 1: Atomically Decrement Stock BEFORE order creation
        const stockItems = cartItems.map((item: any) => ({
            variant_id: item.variant_id,
            quantity: item.quantity
        }));

        const { error: stockError } = await supabase.rpc('decrement_stock_batch', {
            items: stockItems
        });

        if (stockError) {
            console.error('Stock Decrement Failed:', stockError);
            return NextResponse.json(
                { success: false, message: 'Not enough stock available for one or more items in your cart. Please review your cart.' },
                { status: 400 }
            );
        }

        const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const { data: order, error: orderError } = await (supabase
            .from('orders') as any)
            .insert({
                user_id: user.id,
                order_number: orderNumber,
                status: 'processing',
                payment_status: 'pending', // COD is pending until delivery
                payment_id: `COD_${orderNumber}`,
                subtotal,
                shipping_cost: shippingCost,
                total, // Ideally: subtotal + shipping_cost - discountAmount
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
            price: item.price, // Base price + adj
        }));

        const { error: itemsError } = await (supabase.from('order_items') as any).insert(orderItems);

        if (itemsError) {
            console.error('Error creating order items:', itemsError);
            throw itemsError;
        }

        // 4. Clear Only Selected Items from Cart in Database
        const cartItemIds = cartItems.map((item: any) => item.id);
        await supabase.from('cart_items').delete().in('id', cartItemIds);

        // Group Background Tasks (Non-blocking)
        const backgroundTasks = async () => {
            try {
                // 1. Low Stock Alerts
                for (const item of cartItems) {
                    const { data: variant } = await supabase
                        .from('product_variants')
                        .select('stock, size, color, product:products(id, name)')
                        .eq('id', item.variant_id)
                        .single() as { data: any | null };

                    if (variant && variant.stock < 5) {
                        try {
                            const { sendInventoryAlertEmail } = await import('@/lib/email-alerts');
                            const productData: any = Array.isArray(variant.product) ? variant.product[0] : variant.product;
                            await sendInventoryAlertEmail({
                                productName: productData?.name || 'Unknown Product',
                                variant: `Size: ${variant.size}, Color: ${variant.color}`,
                                remainingStock: variant.stock,
                                productId: productData?.id
                            });
                        } catch (e) {
                            console.error('Failed to send inventory alert', e);
                        }
                    }
                }

                // 2. Order Confirmation Email
                const productIds = cartItems.map((item: any) => item.product_id);
                const { data: products } = await supabase
                    .from('products')
                    .select('id, name')
                    .in('id', productIds) as { data: any[] | null };

                const emailItems = cartItems.map((item: any) => {
                    const product = products?.find((p) => p.id === item.product_id);
                    return {
                        name: product?.name || 'Create',
                        quantity: item.quantity,
                        price: (item.price * item.quantity).toFixed(2),
                    };
                });

                await sendOrderConfirmationEmail({
                    orderNumber: order.order_number,
                    customerName: user.user_metadata.full_name || 'Customer',
                    customerEmail: user.email || '',
                    totalAmount: total.toFixed(2),
                    items: emailItems,
                });

                // 3. Send WhatsApp Confirmation
                if (userPhone) {
                    await sendOrderConfirmationWhatsApp(
                        userPhone,
                        user.user_metadata.full_name || 'Customer',
                        order.order_number,
                        total.toFixed(2),
                        true // isCOD
                    ).catch(e => console.error('Failed to send COD WhatsApp:', e));
                }
            } catch (err) {
                console.error('COD Background Tasks Error:', err);
            }
        };

        // Await background tasks (Email, WhatsApp) to guarantee delivery in serverless context
        await backgroundTasks();

        return NextResponse.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order.id,
            orderNumber: order.order_number,
        });
    } catch (error: any) {
        console.error('Error creating COD order:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Order creation failed' },
            { status: 500 }
        );
    }
}
