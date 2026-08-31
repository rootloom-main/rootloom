'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { sanitizeRedirectPath } from '@/lib/utils/redirect';
import { signInWithIdentifier, verifyOtpEx } from '@/app/auth/actions';

function formatDisplayContact(contact: string): string {
  if (!contact) return '';
  const trimmed = contact.trim();
  if (trimmed.includes('@')) return trimmed;
  const cleanDigits = trimmed.replace(/\D/g, '');
  if (cleanDigits.length === 10) {
    return `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
  }
  if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
    const last10 = cleanDigits.slice(2);
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return trimmed;
}

export function LoginForm() {
    const router = useRouter();
    const { refreshSession } = useAuth();
    const searchParams = useSearchParams();

    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [formattedContact, setFormattedContact] = useState('');

    // OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);

    // Timer Logic
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [timeLeft]);

    // Auto-submit OTP when all 6 digits are filled
    useEffect(() => {
        if (otp.length === 6) {
            handleVerifyOtp();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp]);

    async function handleSendOtp(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!identifier) return;

        const input = identifier.trim();
        const isEmail = input.includes('@');
        const cleanPhone = input.replace(/\D/g, '');
        const isPhone = /^[6-9]\d{9}$/.test(cleanPhone) || (cleanPhone.length === 12 && cleanPhone.startsWith('91'));

        if (!isEmail && !isPhone) {
            toast.error('Please enter a valid email address or 10-digit mobile number.');
            return;
        }

        setLoading(true);
        try {
            const result = await signInWithIdentifier(input);
            if (result.error) throw new Error(result.error);

            setOtpSent(true);
            setTimeLeft(60); // 60s cooldown
            setFormattedContact(result.formattedContact || input);
            toast.success(result.type === 'sms' ? 'OTP sent to your mobile number.' : 'Secure verification code sent to your inbox.');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to send verification code');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (loading || otp.length !== 6) return;

        setLoading(true);
        try {
            const source = searchParams?.get('source') || 'profile';
            const type = identifier.includes('@') ? 'email' : 'sms';
            const result = await verifyOtpEx(otp, type, identifier.trim(), source);

            if (result.error) throw new Error(result.error);

            toast.success('Logged in successfully!');

            // 1. Force a session sync in the client-side context
            await refreshSession();

            const next = sanitizeRedirectPath(searchParams?.get('next'), '/');
            const redirectUrl = result.isNewUser
                ? `/auth/onboarding?next=${encodeURIComponent(next)}`
                : next;

            // 2. Refresh the server-side components
            router.refresh();

            // 3. HARD REDIRECT - The most reliable fix
            // Using window.location.href guarantees the server reads the new cookies
            // and the entire page state is fresh.
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 100);
        } catch (error: any) {
            toast.error(error.message || 'Invalid code. Please try again.');
            setOtp('');
        } finally {
            setLoading(false);
        }
    }

    const isSubmitting = loading || isPending;

    return (
        <Card className="w-full max-w-md shadow-lg border-stone-200">
            <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-serif text-deep-forest">
                    {otpSent ? 'Enter Code' : 'Welcome Back'}
                </CardTitle>
                <CardDescription className="text-stone-500 text-sm leading-relaxed">
                    {otpSent ? (
                        <span>
                            We sent a code to{' '}
                            <span className="font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md inline-block whitespace-nowrap tracking-wide">
                                {formatDisplayContact(formattedContact)}
                            </span>
                        </span>
                    ) : (
                        'Sign in with your email or mobile number to access your account'
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="identifier">Email or mobile number</Label>
                            <Input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="name@example.com or 9999999999"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={isSubmitting || !identifier}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Get OTP'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="flex justify-center">
                            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={isSubmitting || otp.length < 6}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Login'}
                        </Button>

                        <div className="flex flex-col items-center gap-2 text-sm">
                            {timeLeft > 0 ? (
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <Timer className="w-3 h-3" /> Resend code in {timeLeft}s
                                </span>
                            ) : (
                                <Button
                                    variant="link"
                                    type="button"
                                    onClick={() => handleSendOtp()}
                                    className="text-slate-900 p-0 h-auto"
                                    disabled={isSubmitting}
                                >
                                    Resend Code
                                </Button>
                            )}
                            <Button
                                variant="link"
                                type="button"
                                onClick={() => {
                                    setOtpSent(false);
                                    setOtp('');
                                }}
                                className="text-stone-500 p-0 h-auto text-xs"
                            >
                                Change Input
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
