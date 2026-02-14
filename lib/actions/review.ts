'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function approveReview(reviewId: string) {
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { success: false, message: 'Forbidden' };
    }

    const { error } = await supabase
        .from('reviews')
        .update({ is_approved: true })
        .eq('id', reviewId);

    if (error) return { success: false, message: 'Failed to approve review' };

    revalidatePath('/admin/reviews');
    return { success: true, message: 'Review approved' };
}

export async function deleteReview(reviewId: string) {
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { success: false, message: 'Forbidden' };
    }

    const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

    if (error) return { success: false, message: 'Failed to delete review' };

    revalidatePath('/admin/reviews');
    return { success: true, message: 'Review deleted' };
}

export async function submitReview(formData: FormData) {
    const supabase = await createClient();
    const productId = formData.get('productId') as string;
    const rating = parseInt(formData.get('rating') as string);
    const comment = formData.get('comment') as string;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'You must be logged in to submit a review' };
    }

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

    if (existingReview) {
        return { success: false, message: 'You have already reviewed this product' };
    }

    const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        product_id: productId,
        rating,
        comment,
        is_approved: false // Default to pending
    });

    if (error) {
        console.error('Error submitting review:', error);
        return { success: false, message: 'Failed to submit review' };
    }

    revalidatePath(`/products/${productId}`);
    return { success: true, message: 'Review submitted for approval' };
}
