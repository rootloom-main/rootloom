'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function signInWithIdentifier(identifier: string) {
    const headerList = headers();
    const ip = headerList.get('x-forwarded-for') || '127.0.0.1';

    const { success } = await checkRateLimit(ip);
    if (!success) {
        return { error: 'Too many requests. Please wait a minute.' };
    }

    const supabase = await createClient();
    const isEmail = identifier.includes('@');

    if (isEmail) {
        const { error } = await supabase.auth.signInWithOtp({
            email: identifier,
            options: {
                shouldCreateUser: true,
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
            },
        });
        if (error) return { error: error.message };
    } else {
        let formattedPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+91' + formattedPhone;
        }
        const { error } = await supabase.auth.signInWithOtp({
            phone: formattedPhone,
        });
        if (error) return { error: error.message };
    }

    return { success: true };
}

export async function verifyOtpEx(token: string, type: 'sms' | 'email', contact: string) {
    const supabase = await createClient();
    const formattedContact = type === 'sms' && !contact.startsWith('+') ? `+91${contact}` : contact;

    let result;
    if (type === 'sms') {
        result = await supabase.auth.verifyOtp({
            phone: formattedContact,
            token,
            type: 'sms',
        });
    } else {
        result = await supabase.auth.verifyOtp({
            email: formattedContact,
            token,
            type: 'email',
        });
    }

    if (result.error) {
        return { error: result.error.message };
    }

    // Check if profile exists
    if (!result.data.user?.id) {
        return { error: 'User ID missing after verification' };
    }

    // Check for identity consolidation (Phone-first)
    // If phone is provided, check for uniqueness
    if (type === 'sms' && result.data.user?.phone) { // Original condition
        const phone = result.data.user.phone; // Original phone assignment
        const adminSupabase = createAdminClient(); // Original admin client creation

        // Find if this phone already belongs to another profile (e.g. an email account)
        const { data: existingProfile } = await adminSupabase
            .from('profiles')
            .select('id, email')
            .eq('phone', phone)
            .single();

        if (existingProfile && existingProfile.id !== result.data.user.id) {
            console.log(`Identity Conflict: Phone ${phone} found on ${existingProfile.id}. Merging into ${result.data.user.id}`);

            // 1. Move the profile data to the new Auth ID
            // Cascade ensures orders/addresses/etc. move too
            const { error: mergeError } = await adminSupabase
                .from('profiles')
                .update({ id: result.data.user.id })
                .eq('id', existingProfile.id);

            if (mergeError) {
                console.error('Failed to merge profiles:', mergeError);
            } else {
                // 2. Cleanup: Delete the old auth user (it no longer has a profile or any data)
                await adminSupabase.auth.admin.deleteUser(existingProfile.id);

                // 3. Update new user with old email if missing
                if (existingProfile.email && !result.data.user.email) {
                    await adminSupabase.auth.admin.updateUserById(result.data.user.id, {
                        email: existingProfile.email,
                        email_confirm: true
                    });
                }
            }
        }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', result.data.user.id)
        .single();

    return {
        success: true,
        isNewUser: !profile,
        user: result.data.user
    };
}

export async function signOutEx() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
}
