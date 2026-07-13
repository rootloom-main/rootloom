'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { sendOtpEmail } from '@/lib/email';
import crypto from 'crypto';
import { recordOpsEvent } from '@/lib/ops-events';

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_MINUTES = 15;

function normalizeIdentifier(identifier: string) {
    return identifier.trim().toLowerCase();
}

function getOtpHashSecret() {
    const secret = process.env.OTP_HASH_SECRET;
    if (!secret) {
        return null;
    }
    return secret;
}

function hashOtp(email: string, token: string) {
    const secret = getOtpHashSecret();
    if (!secret) {
        throw new Error('OTP_HASH_SECRET is not configured.');
    }

    return crypto
        .createHmac('sha256', secret)
        .update(`${normalizeIdentifier(email)}:${token}`)
        .digest('hex');
}

function safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function auditOtpEvent(adminSupabase: any, email: string, event: string, metadata: Record<string, any> = {}) {
    const ip = (await headers()).get('x-forwarded-for') || '127.0.0.1';
    await adminSupabase.from('auth_otp_audit_log').insert({
        email: normalizeIdentifier(email),
        event,
        ip,
        metadata,
    }).throwOnError?.();

    await recordOpsEvent({
        eventType: 'auth.otp',
        status: event,
        channel: 'email',
        reference: normalizeIdentifier(email),
        metadata,
    });
}

function toErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message);
    }
    return 'Unexpected authentication error. Please try again.';
}

export async function signInWithIdentifier(identifier: string) {
    try {
        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for') || '127.0.0.1';

        const { success } = await checkRateLimit(ip);
        if (!success) {
            return { error: 'Too many requests. Please wait a minute.' };
        }

        const normalizedIdentifier = normalizeIdentifier(identifier);
        const isEmail = normalizedIdentifier.includes('@');

        if (!isEmail) {
            return { error: 'Please enter a valid email address. Mobile login is coming in a future update.' };
        }

        if (!getOtpHashSecret()) {
            console.error('OTP_HASH_SECRET is missing. OTP login is disabled.');
            return { error: 'Login is temporarily unavailable. Please contact support.' };
        }

        // 1. Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 2. Save to our custom auth_otps table
        const adminSupabase = createAdminClient();
        const { error: dbError } = await (adminSupabase as any)
            .from('auth_otps')
            .insert([
                {
                    email: normalizedIdentifier,
                    code: '[hashed]',
                    code_hash: hashOtp(normalizedIdentifier, otpCode),
                    failed_attempts: 0,
                    locked_until: null,
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
            return { error: `Email Error: ${toErrorMessage(emailResult.error)}` };
        }
        await auditOtpEvent(adminSupabase, normalizedIdentifier, 'otp_sent').catch(() => {});

        return { success: true };
    } catch (error) {
        console.error('OTP sign-in failed:', error);
        return { error: toErrorMessage(error) };
    }
}

export async function verifyOtpEx(token: string, type: 'sms' | 'email', contact: string, source?: string): Promise<{ 
    success?: boolean; 
    error?: string; 
    redirectUrl?: string; 
    isNewUser?: boolean; 
    user?: any; 
}> {
    try {
        const headerList = await headers();
        const ip = headerList.get('x-forwarded-for') || '127.0.0.1';
        const { success } = await checkRateLimit(`${ip}:verify`);
        if (!success) {
            return { error: 'Too many attempts. Please wait a minute.' };
        }

        const supabase = await createClient();
        const formattedContact = type === 'sms' && !contact.startsWith('+') ? `+91${contact}` : normalizeIdentifier(contact);

        let result;
        if (type === 'sms') {
            result = await supabase.auth.verifyOtp({
                phone: formattedContact,
                token,
                type: 'sms',
            });
        } else {
            if (!getOtpHashSecret()) {
                console.error('OTP_HASH_SECRET is missing. OTP verification is disabled.');
                return { error: 'Login is temporarily unavailable. Please contact support.' };
            }

        // Custom Email OTP verification
        const adminSupabase = createAdminClient();
        
        // 1. Check our custom table
        const { data: otpData, error: otpError } = await (adminSupabase as any)
            .from('auth_otps')
            .select('*')
            .eq('email', formattedContact)
            .gt('expires_at', new Date().toISOString())
            .is('consumed_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (otpError || !otpData) {
            await auditOtpEvent(adminSupabase, formattedContact, 'otp_invalid_missing').catch(() => {});
            return { error: 'Invalid or expired verification code.' };
        }

        if (otpData.locked_until && new Date(otpData.locked_until).getTime() > Date.now()) {
            await auditOtpEvent(adminSupabase, formattedContact, 'otp_locked').catch(() => {});
            return { error: 'Too many incorrect codes. Please wait 15 minutes before trying again.' };
        }

        const expectedHash = otpData.code_hash || hashOtp(formattedContact, otpData.code);
        const receivedHash = hashOtp(formattedContact, token);

        if (!safeCompare(expectedHash, receivedHash)) {
            const failedAttempts = Number(otpData.failed_attempts || 0) + 1;
            const lockUntil = failedAttempts >= MAX_OTP_ATTEMPTS
                ? new Date(Date.now() + OTP_LOCK_MINUTES * 60 * 1000).toISOString()
                : null;

            await (adminSupabase as any)
                .from('auth_otps')
                .update({
                    failed_attempts: failedAttempts,
                    locked_until: lockUntil,
                })
                .eq('id', otpData.id);

            await auditOtpEvent(adminSupabase, formattedContact, lockUntil ? 'otp_locked_after_failures' : 'otp_failed', {
                failed_attempts: failedAttempts,
            }).catch(() => {});

            return { error: 'Invalid or expired verification code.' };
        }

        // 2. Cleanup: Delete the used OTP
        await (adminSupabase as any)
            .from('auth_otps')
            .update({ consumed_at: new Date().toISOString() })
            .eq('id', otpData.id);

        await auditOtpEvent(adminSupabase, formattedContact, 'otp_verified').catch(() => {});

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
        // Use the verification_type returned by generateLink because for new users,
        // it generates a 'signup' verification type rather than 'magiclink'.
        const verificationType = linkData.properties.verification_type as any;
        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: verificationType || 'magiclink',
        });

        if (verifyError) {
            console.error('Server-side verify error:', verifyError);
            return { error: 'Verification successful, but failed to create session.' };
        }

        result = { data: verifyData, error: null };
    }

    if (result.error) {
        return { error: result.error.message };
    }

    // Check if profile exists
    if (!result.data?.user?.id) {
        return { error: 'User ID missing after verification' };
    }

    // Check for identity consolidation (Phone-first)
    // If phone is provided, check for uniqueness
    if (type === 'sms' && result.data.user?.phone) {
        const phone = result.data.user.phone;
        const adminSupabase = createAdminClient();

        // Find if this phone already belongs to another profile (e.g. an email account)
        const { data: existingProfile } = await adminSupabase
            .from('profiles')
            .select('id, email')
            .eq('phone', phone)
            .single();

        if (existingProfile && existingProfile.id !== result.data.user.id) {
            console.warn('[Auth] Identity conflict: merging duplicate phone profile');

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
        .select('id, signup_source, created_at')
        .eq('id', result.data.user.id)
        .single();

    const isNewUser = !profile || !profile.signup_source;

    // Save telemetry metadata
    const now = new Date().toISOString();
    const updateData: any = { last_login: now };
    if (isNewUser && source) {
        updateData.signup_source = source;
    }
    
    const adminSupabase = createAdminClient();
    await adminSupabase
        .from('profiles')
        .update(updateData)
        .eq('id', result.data.user.id);

    return {
        success: true,
        isNewUser: isNewUser,
        user: result.data.user
    };
    } catch (error) {
        console.error('OTP verification failed:', error);
        return { error: toErrorMessage(error) };
    }
}

export async function signOutEx() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/');
}
