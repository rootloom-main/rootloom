'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function completeOnboarding(data: { name: string; email?: string; phone?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    // If phone is provided, check for uniqueness
    if (data.phone || user.phone) {
        const phone = (data.phone || user.phone) as string;
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .neq('id', user.id)
            .single();

        if (existing) {
            return { error: 'This phone number is already associated with another account.' };
        }
    }

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: data.name,
            email: data.email || user.email || '',
            phone: data.phone || user.phone,
            role: 'user',
            updated_at: new Date().toISOString(),
        });

    if (error) {
        console.error('Onboarding Error:', error);
        return { error: error.message };
    }

    return { success: true };
}
