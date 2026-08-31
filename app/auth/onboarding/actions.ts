'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function normalizePhone(phone: string): string {
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length === 10) return `+91${cleanDigits}`;
    if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) return `+${cleanDigits}`;
    if (phone.startsWith('+')) return `+${cleanDigits}`;
    return `+91${cleanDigits}`;
}

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
    const rawPhone = data.phone?.trim() || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
        return { error: 'Phone number must be at least 10 digits.' };
    }

    const normalizedPhone = normalizePhone(rawPhone);
    const phoneVariants = [normalizedPhone, cleanDigits, cleanDigits.slice(-10), `91${cleanDigits.slice(-10)}`];

    // Check for uniqueness of phone number across all variants
    const adminSupabase = createAdminClient();
    const { data: existing } = await adminSupabase
        .from('profiles')
        .select('id')
        .in('phone', phoneVariants)
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
            phone: normalizedPhone,
            role: 'user',
            updated_at: new Date().toISOString(),
        });

    if (profileError) {
        console.error('Onboarding profile update error:', profileError);
        return { error: profileError.message };
    }

    // 2. Sync phone to auth.users
    await adminSupabase.auth.admin.updateUserById(user.id, {
        phone: normalizedPhone,
        phone_confirm: true,
        user_metadata: {
            full_name: data.name.trim(),
            name: data.name.trim(),
            phone: normalizedPhone,
        }
    }).catch((err) => {
        console.warn('[Onboarding] Error syncing phone to auth.users:', err);
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
                phone: normalizedPhone,
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
