import { SupabaseClient } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from '@/lib/email';
// import { sendInventoryAlertEmail } from '@/lib/email-alerts'; // Cyclic dependency risk if not careful, better to keep dynamic import

function isMissingRpcSignature(error: any) {
    const message = String(error?.message || error?.details || error?.hint || '');
    return (
        error?.code === 'PGRST202' ||
        error?.code === '42883' ||
        message.includes('Could not find the function') ||
        message.includes('function public.create_complete_order') ||
        message.includes('function create_complete_order')
    );
}

function uniqueIds(ids: Array<string | undefined | null>) {
    return [...new Set(ids.filter(Boolean) as string[])];
}

async function cleanupPurchasedCartRows(
    supabase: SupabaseClient,
    input: {
        userId: string;
        cartItemIds: string[];
        productIds: string[];
        variantIds: string[];
    }
) {
    const deletedIds = new Set<string>();

    if (input.cartItemIds.length > 0) {
        const { data, error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', input.userId)
            .in('id', input.cartItemIds)
            .select('id');

        if (error) throw error;
        (data || []).forEach((item: any) => deletedIds.add(item.id));
    }

    if (input.variantIds.length > 0) {
        const { data, error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', input.userId)
            .in('variant_id', input.variantIds)
            .select('id');

        if (error) throw error;
        (data || []).forEach((item: any) => deletedIds.add(item.id));
    }

    if (input.productIds.length > 0) {
        const { data, error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', input.userId)
            .in('product_id', input.productIds)
            .select('id');

        if (error) throw error;
        (data || []).forEach((item: any) => deletedIds.add(item.id));
    }

    return deletedIds.size;
}

export async function processOrderCreation({
    supabase,
    userId,
    paymentId,
    amount, // Total amount paid
    cartItems,
    addressId,
    discountAmount,
    couponCode,
    shippingCost,
    subtotal,
    userEmail,
    userName,
    orderStatus = 'processing',
    paymentStatus = 'completed',
    requireReservation = false,
    cartItemIds = [],
    cleanupPurchasedCartItems = false,
}: {
    supabase: SupabaseClient;
    userId: string;
    paymentId: string;
    amount: number;
    cartItems: any[];
    addressId: string;
    discountAmount: number;
    couponCode: string | null;
    shippingCost: number;
    subtotal: number;
    userEmail: string;
    userName: string;
    orderStatus?: string;
    paymentStatus?: string;
    requireReservation?: boolean;
    cartItemIds?: string[];
    cleanupPurchasedCartItems?: boolean;
}) {
    const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const rpcItems = cartItems.map((item: any) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price
    }));

    // 1. Create Order Atomically via RPC
    let result: any;
    const { data: atomicResult, error: rpcError } = await supabase.rpc('create_complete_order', {
        p_user_id: userId,
        p_order_number: orderNumber,
        p_payment_id: paymentId,
        p_subtotal: subtotal,
        p_shipping_cost: shippingCost,
        p_total: amount,
        p_discount_amount: discountAmount || 0,
        p_coupon_code: couponCode,
        p_shipping_address_id: addressId,
        p_items: rpcItems,
        p_order_status: orderStatus,
        p_payment_status: paymentStatus,
        p_require_reservation: requireReservation,
        p_cart_item_ids: cartItemIds,
        p_cleanup_purchased_cart_items: cleanupPurchasedCartItems
    } as any);

    if (rpcError) {
        if (!isMissingRpcSignature(rpcError)) {
            throw rpcError;
        }

        console.warn('[Orders] Falling back to legacy create_complete_order RPC signature. Apply the latest Supabase migrations to restore atomic cart cleanup.', rpcError);
        const { data: legacyResult, error: legacyRpcError } = await supabase.rpc('create_complete_order', {
            p_user_id: userId,
            p_order_number: orderNumber,
            p_payment_id: paymentId,
            p_subtotal: subtotal,
            p_shipping_cost: shippingCost,
            p_total: amount,
            p_discount_amount: discountAmount || 0,
            p_coupon_code: couponCode,
            p_shipping_address_id: addressId,
            p_items: rpcItems,
            p_order_status: orderStatus,
            p_payment_status: paymentStatus,
            p_require_reservation: requireReservation
        } as any);

        if (legacyRpcError) {
            throw legacyRpcError;
        }

        result = legacyResult;

        if (cleanupPurchasedCartItems) {
            await cleanupPurchasedCartRows(supabase, {
                userId,
                cartItemIds,
                productIds: uniqueIds(cartItems.map((item: any) => item.product_id)),
                variantIds: uniqueIds(cartItems.map((item: any) => item.variant_id)),
            }).catch((cleanupError) => {
                console.error('[Orders] Legacy cart cleanup failed after successful order creation', cleanupError);
            });
        }
    } else {
        result = atomicResult;
    }

    // Re-fetch order to return full object if needed, or construct it
    const order = {
        id: result.id,
        order_number: result.order_number,
    };

    // 3. Prepare non-critical tasks to run in parallel
    const backgroundTasks = (async () => {
        try {
            // Inventory Alerts
            const inventoryPromises = cartItems.map(async (item: any) => {
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
                            productName: productData?.name || 'Unknown',
                            variant: `Size: ${variant.size}, Color: ${variant.color}`,
                            remainingStock: variant.stock,
                            productId: productData?.id
                        });
                    } catch (e) {
                        console.error('Failed to send inventory alert', e);
                    }
                }
            });

            // Order Confirmation Email (only send if payment completed or order processing)
            const emailItems = cartItems.map((item: any) => ({
                name: item.name || 'Product',
                quantity: item.quantity,
                price: (item.price * item.quantity).toFixed(2),
            }));

            const emailPromise = (paymentStatus === 'completed' || orderStatus === 'processing')
                ? sendOrderConfirmationEmail({
                    orderNumber: order.order_number,
                    customerName: userName,
                    customerEmail: userEmail,
                    totalAmount: amount.toFixed(2),
                    items: emailItems,
                })
                : Promise.resolve();

            // Wait for all non-critical tasks to settle (parallelized)
            await Promise.allSettled([...inventoryPromises, emailPromise]);
        } catch (err) {
            console.error('Background order tasks failed:', err);
        }
    })();

    return { order, backgroundTasks };
}
