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

    // Check existing
    const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('variant_id', variantId)
        .single();

    if (existingItem) {
        return updateCartItem(existingItem.id, existingItem.quantity + quantity);
    } else {
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

        revalidatePath('/cart'); // Optional, if we have a cart page
        return { success: true, message: 'Added to cart' };
    }
}

export async function updateCartItem(itemId: string, quantity: number) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return { success: false, message: 'Unauthorized' };

    if (quantity <= 0) {
        return removeFromCart(itemId);
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

    return { success: true, message: 'Cart cleared' };
}
