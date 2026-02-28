'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Timer } from 'lucide-react';
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

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    // OTP State
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Timer Logic
    useEffect(() => {
        if (timeLeft > 0) {
            timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (timeLeft === 0 && timerRef.current) {
            clearTimeout(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timeLeft]);

    // Auto-submit OTP
    useEffect(() => {
        if (otp.length === 6) {
            handleVerifyOtp();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otp]);

    async function handleSendEmailOtp(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) {
                // Check if the error is due to user not found (Supabase specific)
                // Note: specific error message depends on Supabase/Auth version, usually 'Signups not allowed for this instance' 
                // or generic error if shouldCreateUser is false. 
                // We will catch it in the catch block generally, or throw specific if needed.
                throw error;
            }

            if (error) throw error;

            setOtpSent(true);
            setTimeLeft(60);
            toast.success('OTP sent to your email.');
        } catch (error: any) {
            console.error(error);
            if (error.message.includes('Signups not allowed') || error.message.includes('User not found') || error.status === 400) {
                toast.error('Account not found. Redirecting to register...');
                setTimeout(() => router.push('/auth/signup'), 1500);
                return;
            }

            if (error.status === 429 || error.message.toLowerCase().includes('rate limit')) {
                toast.error('Too many requests. Please wait a minute before trying again.');
                return;
            }
            toast.error(error.message || 'Failed to send email OTP');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (loading || otp.length !== 6) return;

        setLoading(true);
        try {
            const result = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'email',
            });

            if (result.error) throw result.error;

            toast.success('Logged in successfully!');
            router.refresh();
            const next = searchParams?.get('next') || '/';
            router.push(next);
        } catch (error: any) {
            toast.error(error.message || 'Invalid code');
            setOtp('');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-md shadow-lg border-stone-200">
            <CardHeader className="text-center space-y-2">
                <CardTitle className="text-2xl font-serif text-deep-forest">
                    {otpSent ? 'Enter Code' : 'Welcome Back'}
                </CardTitle>
                <CardDescription>
                    {otpSent
                        ? `We sent a code to ${email}`
                        : 'Sign in with your email to access your account'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!otpSent ? (
                    <form onSubmit={handleSendEmailOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={loading || !email}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Get OTP'}
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

                        <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={loading || otp.length < 6}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Login'}
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
                                    onClick={handleSendEmailOtp}
                                    className="text-slate-900 p-0 h-auto"
                                    disabled={loading}
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
                                Change Email
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card >
    );
}
