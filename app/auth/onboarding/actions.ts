'use server';

import { createClient } from '@/lib/supabase/server';

export async function completeOnboarding(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: {
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    }
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    // Clean phone number (extract digits only or check length)
    const cleanedPhone = data.phone?.trim() || '';
    if (!cleanedPhone || cleanedPhone.length < 10) {
        return { error: 'Phone number must be at least 10 digits.' };
    }

    // Check for uniqueness of phone number
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanedPhone)
        .neq('id', user.id)
        .maybeSingle();

    if (existing) {
        return { error: 'This phone number is already associated with another account.' };
    }

    // 1. Update/Upsert profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: data.name.trim(),
            email: data.email || user.email || '',
            phone: cleanedPhone,
            role: 'user',
            updated_at: new Date().toISOString(),
        });

    if (profileError) {
        console.error('Onboarding profile update error:', profileError);
        return { error: profileError.message };
    }

    await supabase.auth.updateUser({
        data: {
            full_name: data.name.trim(),
            name: data.name.trim(),
            phone: cleanedPhone,
        },
    });

    // 2. Insert Shipping Address if provided
    if (data.address) {
        // Unset any previous defaults just in case
        await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);

        const { error: addressError } = await supabase
            .from('addresses')
            .insert({
                user_id: user.id,
                full_name: data.name.trim(),
                phone: cleanedPhone,
                address_line1: data.address.address_line1.trim(),
                address_line2: data.address.address_line2?.trim() || '',
                city: data.address.city.trim(),
                state: data.address.state.trim(),
                postal_code: data.address.postal_code.trim(),
                country: data.address.country || 'India',
                is_default: true,
            });

        if (addressError) {
            console.error('Onboarding address insertion error:', addressError);
            return { error: 'Profile saved, but failed to save shipping address. You can add it at checkout.' };
        }
    }

    return { success: true };
}
