'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { sendOtpEmail } from '@/lib/email';

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
        // 1. Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 2. Save to our custom auth_otps table
        const adminSupabase = createAdminClient();
        const { error: dbError } = await (adminSupabase as any)
            .from('auth_otps')
            .insert([
                {
                    email: identifier,
                    code: otpCode,
                    expires_at: expiresAt.toISOString(),
                }
            ]);

        if (dbError) {
            console.error('Database error saving OTP:', dbError);
            return { error: 'Failed to initialize verification. Please try again.' };
        }

        // 3. Send via Resend
        const emailResult = await sendOtpEmail(identifier, otpCode);
        if (!emailResult.success) {
            return { error: `Email Error: ${emailResult.error}` };
        }
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

export async function verifyOtpEx(token: string, type: 'sms' | 'email', contact: string): Promise<{ 
    success?: boolean; 
    error?: string; 
    redirectUrl?: string; 
    isNewUser?: boolean; 
    user?: any; 
}> {
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
        // Custom Email OTP verification
        const adminSupabase = createAdminClient();
        
        // 1. Check our custom table
        const { data: otpData, error: otpError } = await (adminSupabase as any)
            .from('auth_otps')
            .select('*')
            .eq('email', formattedContact)
            .eq('code', token)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (otpError || !otpData) {
            return { error: 'Invalid or expired verification code.' };
        }

        // 2. Cleanup: Delete the used OTP
        await (adminSupabase as any).from('auth_otps').delete().eq('id', otpData.id);

        // 3. Generate a real Supabase session using admin.generateLink
        const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
            type: 'magiclink',
            email: formattedContact,
        });

        if (linkError || !linkData?.properties?.hashed_token) {
            console.error('Sign-in link error:', linkError);
            return { error: 'Verification successful, but sign-in failed. Please try again.' };
        }

        // 4. Use the non-admin client (supabase) to verify the token hash.
        // This will automatically set the session cookies on the response.
        const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'magiclink',
        });

        if (verifyError) {
            console.error('Server-side verify error:', verifyError);
            return { error: 'Verification successful, but failed to create session.' };
        }

        return { success: true };
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
