'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signInWithEmailEx(email: string) {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function signInWithPhoneEx(phone: string) {
    const supabase = await createClient();
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function verifyOtpEx(token: string, type: 'sms' | 'email', contact: string) {
    const supabase = await createClient();
    const formattedContact = type === 'sms' && !contact.startsWith('+') ? `+91${contact}` : contact;

    let error;

    if (type === 'sms') {
        const res = await supabase.auth.verifyOtp({
            phone: formattedContact,
            token,
            type: 'sms',
        });
        error = res.error;
    } else {
        const res = await supabase.auth.verifyOtp({
            email: formattedContact,
            token,
            type: 'email',
        });
        error = res.error;
    }

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function signOutEx() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
}
