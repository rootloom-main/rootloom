'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

export async function getWishlist() {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('wishlists')
        .select(`
            id,
            product_id,
            product:products!inner(id, deleted_at)
        `)
        .eq('user_id', user.id)
        .is('products.deleted_at', null);

    if (error) {
        console.error('Error fetching wishlist:', error);
        return [];
    }

    // Map to keep format identical { id, product_id }
    return (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id
    }));
}

export async function toggleWishlist(productId: string) {
    const supabase = await createClient() as any;

    // Check User
    const user = await getCurrentUser();
    if (!user) return { success: false, message: 'Please login to use wishlist' };

    // Check if already in wishlist
    const { data: existing } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

    if (existing) {
        // Remove
        const { error } = await supabase
            .from('wishlists')
            .delete()
            .eq('id', existing.id);

        if (error) {
            console.error('Error removing from wishlist:', error);
            return { success: false, message: 'Failed to remove from wishlist' };
        }

        revalidatePath('/account/wishlist');
        revalidatePath(`/products/${productId}`); // Revalidate product page
        return { success: true, message: 'Removed from wishlist', action: 'removed' };
    } else {
        // Add
        const { error } = await supabase
            .from('wishlists')
            .insert({
                user_id: user.id,
                product_id: productId
            });

        if (error) {
            console.error('Error adding to wishlist:', error);
            return { success: false, message: 'Failed to add to wishlist' };
        }

        revalidatePath('/account/wishlist');
        revalidatePath(`/products/${productId}`);
        return { success: true, message: 'Added to wishlist', action: 'added' };
    }
}
