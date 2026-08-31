'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { 
    checkRateLimit, 
    checkIpOtpRateLimit, 
    checkOtpCooldown, 
    checkPhoneOtpRateLimit 
} from '@/lib/rate-limit';
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

        // 1. Enforce Per-IP Limit (Max 5 requests / 15 mins / IP)
        const ipLimit = await checkIpOtpRateLimit(ip);
        if (!ipLimit.success) {
            return { error: ipLimit.error || 'Too many OTP requests from your network. Please wait 15 minutes.' };
        }

        const normalizedIdentifier = normalizeIdentifier(identifier);
        const isEmail = normalizedIdentifier.includes('@');

        // Check if phone number
        const cleanPhone = identifier.replace(/\D/g, '');
        const isPhone = /^[6-9]\d{9}$/.test(cleanPhone) || (cleanPhone.length === 12 && cleanPhone.startsWith('91'));

        if (!isEmail && !isPhone) {
            return { error: 'Please enter a valid email address or 10-digit mobile number.' };
        }

        // 2. Enforce 60-Second Resend Cooldown per contact
        const cooldownCheck = await checkOtpCooldown(normalizedIdentifier);
        if (!cooldownCheck.success) {
            return { error: cooldownCheck.error || 'Please wait 60 seconds before requesting another OTP.' };
        }

        // 3. Enforce Per-Phone / Contact Limit (Max 3 / 15m and Max 5 / 1h)
        const phoneLimit = await checkPhoneOtpRateLimit(normalizedIdentifier);
        if (!phoneLimit.success) {
            return { error: phoneLimit.error || 'Too many OTP requests for this number. Please try again later.' };
        }

        if (isPhone) {
            const formattedPhone = cleanPhone.length === 12 ? `+${cleanPhone}` : `+91${cleanPhone}`;
            const supabase = await createClient();
            
            const { error: smsError } = await supabase.auth.signInWithOtp({
                phone: formattedPhone,
                options: {
                    shouldCreateUser: true, // Allow signups for phone too
                }
            });

            if (smsError) {
                console.error('Supabase Phone OTP error:', smsError);
                if (smsError.status === 429 || smsError.message.toLowerCase().includes('rate limit')) {
                    return { error: 'Too many requests. Please wait a minute before trying again.' };
                }
                return { error: smsError.message || 'Failed to send verification code.' };
            }

            return { success: true, type: 'sms', formattedContact: formattedPhone };
        }

        // Email path
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

        return { success: true, type: 'email', formattedContact: normalizedIdentifier };
    } catch (error) {
        console.error('OTP sign-in failed:', error);
        return { error: toErrorMessage(error) };
    }
}

function normalizePhone(phone: string): string | null {
    if (!phone) return null;
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length === 10 && /^[6-9]\d{9}$/.test(cleanDigits)) {
        return `+91${cleanDigits}`;
    }
    if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
        const last10 = cleanDigits.slice(2);
        if (/^[6-9]\d{9}$/.test(last10)) {
            return `+${cleanDigits}`;
        }
    }
    if (phone.startsWith('+') && cleanDigits.length >= 10 && cleanDigits.length <= 15) {
        return `+${cleanDigits}`;
    }
    return null;
}

function getPhoneLookupVariants(phone: string): string[] {
    const cleanDigits = phone.replace(/\D/g, '');
    const variants = new Set<string>();
    if (cleanDigits.length >= 10) {
        const last10 = cleanDigits.slice(-10);
        variants.add(last10);
        variants.add(`91${last10}`);
        variants.add(`+91${last10}`);
    }
    if (phone.trim()) {
        variants.add(phone.trim());
    }
    return Array.from(variants);
}

async function isSafeTemporaryUser(adminSupabase: any, userId: string): Promise<boolean> {
    try {
        const [
            { count: ordersCount },
            { count: addressesCount },
            { count: cartCount },
            { count: wishlistCount },
            { count: reviewsCount },
            { count: returnsCount }
        ] = await Promise.all([
            adminSupabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            adminSupabase.from('addresses').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            adminSupabase.from('cart').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            adminSupabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            adminSupabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            adminSupabase.from('returns').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        ]);

        return (
            (ordersCount || 0) === 0 &&
            (addressesCount || 0) === 0 &&
            (cartCount || 0) === 0 &&
            (wishlistCount || 0) === 0 &&
            (reviewsCount || 0) === 0 &&
            (returnsCount || 0) === 0
        );
    } catch (err) {
        console.error('[Auth Consolidation] Error checking temporary user safety:', err);
        return false;
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
        const formattedContact = type === 'sms'
            ? (normalizePhone(contact) || (contact.startsWith('+') ? contact : `+91${contact}`))
            : normalizeIdentifier(contact);

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

        if (!result.data?.user?.id) {
            return { error: 'User ID missing after verification' };
        }

        let effectiveUserId = result.data.user.id;

        // Identity Consolidation with Production Safeguards
        if (type === 'sms') {
            const canonicalPhone = normalizePhone(contact) || result.data.user.phone || formattedContact;
            const phoneVariants = getPhoneLookupVariants(canonicalPhone);
            const tempUserId = result.data.user.id;
            const adminSupabase = createAdminClient();

            // Find if this verified phone already belongs to an existing canonical account
            const { data: existingProfiles } = await adminSupabase
                .from('profiles')
                .select('id, email, phone, full_name')
                .in('phone', phoneVariants)
                .neq('id', tempUserId);

            const canonicalProfile = existingProfiles?.[0];

            if (canonicalProfile && canonicalProfile.id !== tempUserId) {
                console.log(`[Auth Consolidation] Matching canonical account ${canonicalProfile.id} for phone ${canonicalPhone}`);

                // Safeguard 1: Verify temporary user is safe to delete
                const isSafe = await isSafeTemporaryUser(adminSupabase, tempUserId);

                if (!isSafe) {
                    console.warn(`[Auth Consolidation] Temporary user ${tempUserId} contains existing user data. Aborting automatic delete.`);
                    await recordOpsEvent({
                        eventType: 'auth.identity_consolidation',
                        status: 'conflict_aborted',
                        channel: 'sms',
                        reference: canonicalPhone,
                        metadata: {
                            canonical_user_id: canonicalProfile.id,
                            temporary_user_id: tempUserId,
                            normalized_phone: canonicalPhone,
                            reason: 'temporary_user_has_data',
                        },
                    });
                } else {
                    // Safeguard 2: Verify canonical user exists in Supabase auth
                    const { data: canonicalAuthUser, error: getAuthError } = await adminSupabase.auth.admin.getUserById(canonicalProfile.id);

                    if (!getAuthError && canonicalAuthUser?.user) {
                        // 1. Link and confirm the phone on canonical user in Supabase Auth
                        await adminSupabase.auth.admin.updateUserById(canonicalProfile.id, {
                            phone: canonicalPhone,
                            phone_confirm: true,
                        });

                        // 2. Ensure canonical profile has the standardized phone
                        await adminSupabase
                            .from('profiles')
                            .update({
                                phone: canonicalPhone,
                                last_login: new Date().toISOString(),
                            })
                            .eq('id', canonicalProfile.id);

                        // 3. Delete temporary auth user
                        await adminSupabase.auth.admin.deleteUser(tempUserId);

                        // 4. Establish authenticated session for the canonical account AAAAA
                        if (canonicalProfile.email) {
                            const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
                                type: 'magiclink',
                                email: canonicalProfile.email,
                            });

                            if (!linkError && linkData?.properties?.hashed_token) {
                                const { data: canonicalSession, error: sessionError } = await supabase.auth.verifyOtp({
                                    token_hash: linkData.properties.hashed_token,
                                    type: (linkData.properties.verification_type as any) || 'magiclink',
                                });

                                if (!sessionError && canonicalSession?.user) {
                                    effectiveUserId = canonicalSession.user.id;
                                    result.data.user = canonicalSession.user;
                                }
                            }
                        }

                        await recordOpsEvent({
                            eventType: 'auth.identity_consolidation',
                            status: 'success',
                            channel: 'sms',
                            reference: canonicalPhone,
                            metadata: {
                                canonical_user_id: canonicalProfile.id,
                                temporary_user_id: tempUserId,
                                normalized_phone: canonicalPhone,
                                timestamp: new Date().toISOString(),
                            },
                        });
                    }
                }
            } else {
                // Ensure auth.users.phone is confirmed on current user
                await adminSupabase.auth.admin.updateUserById(tempUserId, {
                    phone: canonicalPhone,
                    phone_confirm: true,
                }).catch(() => {});
            }
        }

        const adminSupabase = createAdminClient();
        const { data: profile } = await adminSupabase
            .from('profiles')
            .select('id, signup_source, full_name, phone, created_at')
            .eq('id', effectiveUserId)
            .single();

        const needsOnboarding = !profile?.full_name?.trim() || !profile?.phone?.trim();

        // Save telemetry metadata
        const now = new Date().toISOString();
        const updateData: any = { last_login: now };
        if (!profile?.signup_source && source) {
            updateData.signup_source = source;
        }

        await adminSupabase
            .from('profiles')
            .update(updateData)
            .eq('id', effectiveUserId);

        return {
            success: true,
            isNewUser: needsOnboarding,
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
