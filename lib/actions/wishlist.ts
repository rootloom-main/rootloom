'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleWishlist(productId: string) {
    const supabase = await createClient();

    // Check User
    const { data: { user } } = await supabase.auth.getUser();
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
