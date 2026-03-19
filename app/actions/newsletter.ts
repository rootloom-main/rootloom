'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

export async function subscribeToNewsletter(email: string) {
    if (!email) return { error: 'Email is required' };
    
    const validated = schema.safeParse({ email });
    if (!validated.success) {
        return { error: validated.error.errors[0].message };
    }

    const supabase = await createClient();
    
    // Check if table exists/insert
    // Note: This requires the 'newsletter_subscriptions' table to exist in Supabase
    const { error } = await supabase
        .from('newsletter_subscriptions' as any)
        .insert([{ email: validated.data.email }]);

    if (error) {
        // Handle unique constraint violation (already subscribed)
        if (error.code === '23505') {
            return { success: true, message: 'You are already in the inner circle!' };
        }
        console.error('Newsletter Error:', error);
        return { error: 'Connection error. Please try again later.' };
    }

    return { success: true, message: 'Welcome to the inner circle! Check your inbox soon.' };
}
