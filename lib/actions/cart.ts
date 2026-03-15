'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

export async function getCart() {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('cart_items')
        .select(
            `
            id,
            product_id,
            variant_id,
            quantity,
            product:products!inner(
                name,
                slug,
                base_price,
                product_images(image_url)
            ),
            variant:product_variants!inner(
                size,
                color,
                price_adjustment,
                stock
            )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching cart:', error);
        return [];
    }

    return data || [];
}

export async function addToCart(productId: string, variantId: string, quantity: number) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return { success: false, message: 'Please login to add items to cart' };

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
        return { success: false, message: 'Invalid quantity' };
    }


    const MAX_CART_LIMIT = 10;

    if (quantity > MAX_CART_LIMIT) {
        return { success: false, message: `You can only add up to ${MAX_CART_LIMIT} of this item.` };
    }

    // Check strict stock
    const { data: variantDB } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', variantId)
        .single();

    if (!variantDB) {
        return { success: false, message: 'Variant not found' };
    }

    // Check existing
    const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('variant_id', variantId)
        .single();

    if (existingItem) {
        const newTotal = existingItem.quantity + quantity;
        if (newTotal > MAX_CART_LIMIT) {
            return { success: false, message: `Cart limit reached. Maximum ${MAX_CART_LIMIT} allowed.` };
        }
        if (newTotal > variantDB.stock) {
            return { success: false, message: `Only ${variantDB.stock} units available in stock.` };
        }
        return updateCartItem(existingItem.id, newTotal);
    } else {
        if (quantity > variantDB.stock) {
            return { success: false, message: `Only ${variantDB.stock} units available in stock.` };
        }

        const { error } = await supabase.from('cart_items').insert({
            user_id: user.id,
            product_id: productId,
            variant_id: variantId,
            quantity,
        });

        if (error) {
            console.error('Error adding to cart:', error);
            return { success: false, message: 'Failed to add to cart' };
        }

        revalidatePath('/', 'layout');
        return { success: true, message: 'Added to cart' };
    }
}

export async function updateCartItem(itemId: string, quantity: number) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return { success: false, message: 'Unauthorized' };

    if (quantity === null || quantity === undefined || !Number.isInteger(quantity)) {
        return { success: false, message: 'Invalid quantity' };
    }

    if (quantity <= 0) {
        return removeFromCart(itemId);
    }

    const MAX_CART_LIMIT = 10;
    if (quantity > MAX_CART_LIMIT) {
        return { success: false, message: `Cart limit reached. Maximum ${MAX_CART_LIMIT} allowed.` };
    }

    // We need to fetch the variant ID attached to this cart item to verify stock
    const { data: currentCartItem } = await supabase
        .from('cart_items')
        .select('variant_id')
        .eq('id', itemId)
        .single();

    if (currentCartItem) {
        const { data: variantDB } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', currentCartItem.variant_id)
            .single();

        if (variantDB && quantity > variantDB.stock) {
            return { success: false, message: `Only ${variantDB.stock} units available in stock.` };
        }
    }

    const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .eq('user_id', user.id); // Ensure ownership

    if (error) {
        console.error('Error updating cart:', error);
        return { success: false, message: 'Failed to update cart' };
    }

    revalidatePath('/', 'layout');
    return { success: true, message: 'Cart updated' };
}

export async function removeFromCart(itemId: string) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return { success: false, message: 'Unauthorized' };

    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error removing from cart:', error);
        return { success: false, message: 'Failed to remove from cart' };
    }

    revalidatePath('/', 'layout');
    return { success: true, message: 'Removed from cart' };
}

export async function clearCart() {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return { success: false, message: 'Unauthorized' };

    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

    if (error) {
        console.error('Error clearing cart:', error);
        return { success: false, message: 'Failed to clear cart' };
    }

    revalidatePath('/', 'layout');
    return { success: true, message: 'Cart cleared' };
}
export async function mergeCart(guestItems: Array<{ productId: string; variantId: string; quantity: number }>) {
    const user = await getCurrentUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    for (const item of guestItems) {
        await addToCart(item.productId, item.variantId, item.quantity);
    }

    revalidatePath('/', 'layout');
    return { success: true, message: 'Cart merged successfully' };
}
