'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

export async function approveReview(reviewId: string) {
    const supabase = await createClient() as any;

    // Check Admin
    const user = await getCurrentUser();
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
    const supabase = await createClient() as any;

    // Check Admin
    const user = await getCurrentUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single(); // ... rest of func

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
    const supabase = await createClient() as any;
    const productId = formData.get('productId') as string;
    const rating = parseInt(formData.get('rating') as string);
    const comment = formData.get('comment') as string;
    const title = formData.get('title') as string;
    const imagesJson = formData.get('images') as string;

    let images: string[] = [];
    try {
        images = imagesJson ? JSON.parse(imagesJson) : [];
    } catch (e) {
        console.error('Error parsing images JSON:', e);
    }

    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'You must be logged in to submit a review' };
    }

    // Input Validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!productId || !uuidRegex.test(productId)) {
        return { success: false, message: 'Invalid product ID format' };
    }

    if (isNaN(rating) || rating < 1 || rating > 5) {
        return { success: false, message: 'Rating must be between 1 and 5' };
    }

    if (!comment || comment.trim().length < 10) {
        return { success: false, message: 'Comment must be at least 10 characters long' };
    }

    if (comment.length > 2000) {
        return { success: false, message: 'Comment cannot exceed 2000 characters' };
    }

    if (title && title.length > 100) {
        return { success: false, message: 'Title cannot exceed 100 characters' };
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
        title,
        images,
        is_approved: false // Default to pending
    });

    if (error) {
        console.error('Error submitting review:', error);
        return { success: false, message: 'Failed to submit review' };
    }

    revalidatePath(`/product/${productId}`);
    return { success: true, message: 'Review submitted for approval' };
}
