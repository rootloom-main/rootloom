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

    const fullName = data.name?.trim();
    if (!fullName) {
        return { error: 'Please enter your full name.' };
    }

    // Clean phone number (extract digits only or check length)
    const rawPhone = data.phone?.trim() || user.phone || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
        return { error: 'Phone number must be at least 10 digits.' };
    }

    const normalizedPhone = normalizePhone(rawPhone);
    const phoneVariants = [normalizedPhone, cleanDigits, cleanDigits.slice(-10), `91${cleanDigits.slice(-10)}`];

    // Normalize email (null instead of empty string to prevent unique constraint collisions)
    const rawEmail = (data.email?.trim() || user.email || '').trim().toLowerCase();
    const normalizedEmail = rawEmail.length > 0 ? rawEmail : null;

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return { error: 'Please enter a valid email address.' };
    }

    const adminSupabase = createAdminClient();

    // Check for uniqueness of phone number across other accounts
    const { data: existingPhone } = await adminSupabase
        .from('profiles')
        .select('id')
        .in('phone', phoneVariants)
        .neq('id', user.id)
        .maybeSingle();

    if (existingPhone) {
        return { error: 'This phone number is already associated with another account.' };
    }

    // Check if profile exists and get existing role
    const { data: currentProfile } = await adminSupabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

    const role = currentProfile?.role || 'user';

    // 1. Update/Upsert profile using admin client to prevent RLS permission errors
    const profilePayload: Record<string, any> = {
        id: user.id,
        full_name: fullName,
        phone: normalizedPhone,
        role: role,
        updated_at: new Date().toISOString(),
    };

    if (normalizedEmail) {
        profilePayload.email = normalizedEmail;
    }

    const { error: profileError } = await (adminSupabase as any)
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

    if (profileError) {
        console.error('Onboarding profile update error:', profileError);
        return { error: profileError.message || 'Failed to update profile. Please try again.' };
    }

    // 2. Sync phone & name metadata to auth.users
    const authMetadataUpdate: Record<string, any> = {
        full_name: fullName,
        name: fullName,
        phone: normalizedPhone,
    };

    const authUpdatePayload: Record<string, any> = {
        phone: normalizedPhone,
        phone_confirm: true,
        user_metadata: authMetadataUpdate,
    };

    await adminSupabase.auth.admin.updateUserById(user.id, authUpdatePayload).catch((err) => {
        console.warn('[Onboarding] Error syncing metadata to auth.users:', err);
    });

    // 3. Insert Shipping Address if complete address data is provided
    if (
        data.address &&
        data.address.address_line1?.trim() &&
        data.address.city?.trim() &&
        data.address.state?.trim() &&
        data.address.postal_code?.trim()
    ) {
        try {
            // Unset previous defaults
            await adminSupabase
                .from('addresses')
                .update({ is_default: false })
                .eq('user_id', user.id);

            const { error: addressError } = await adminSupabase
                .from('addresses')
                .insert({
                    user_id: user.id,
                    full_name: fullName,
                    phone: normalizedPhone,
                    address_line1: data.address.address_line1.trim(),
                    address_line2: data.address.address_line2?.trim() || null,
                    city: data.address.city.trim(),
                    state: data.address.state.trim(),
                    postal_code: data.address.postal_code.trim(),
                    country: data.address.country?.trim() || 'India',
                    is_default: true,
                });

            if (addressError) {
                console.warn('Onboarding address insertion error:', addressError);
            }
        } catch (addrErr) {
            console.warn('Onboarding address processing error:', addrErr);
        }
    }

    return { success: true };
}
