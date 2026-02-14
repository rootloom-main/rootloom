'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Phone, Mail, Timer, ArrowRight } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Phone Auth State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Email Auth State (Fallback)
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

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
      handleVerifyOtp(new Event('submit') as any);
    }
  }, [otp]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation for 10 digits
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    const fullPhoneNumber = `+91${phone}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Too many requests. Please try again later.');
        }
        throw error;
      }

      setOtpSent(true);
      setTimeLeft(60);
      toast.success('OTP sent!', { description: `Sent to ${fullPhoneNumber}` });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    if (e.preventDefault) e.preventDefault();
    if (loading || otp.length !== 6) return;

    setLoading(true);
    const fullPhoneNumber = `+91${phone}`;

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhoneNumber,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      toast.success('Account created successfully!');
      const next = searchParams.get('next') || '/';
      router.push(next);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Invalid or expired OTP');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timeLeft > 0) return;
    await handleSendOtp({ preventDefault: () => { } } as React.FormEvent);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        toast.success('Account created successfully!');
        const next = searchParams.get('next') || '/';
        router.push(next);
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-lg border-stone-paper">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-serif text-deep-forest">
            {showEmailSignup ? 'Create Account' : (otpSent ? 'Verify Mobile' : 'Join Root & Loom')}
          </CardTitle>
          <CardDescription>
            {showEmailSignup
              ? 'Sign up with email to start shopping'
              : (otpSent ? `Enter code sent to +91 ${phone}` : 'Enter your mobile number to create an account')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showEmailSignup ? (
            // Phone Signup (Same as login basically)
            <div className="space-y-6">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-deep-forest">Mobile Number</Label>
                    <div className="flex">
                      <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-stone-paper/50 text-slate-bark text-sm font-medium">
                        +91
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setPhone(val);
                        }}
                        className="rounded-l-none"
                        placeholder="98765 43210"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white" disabled={loading || phone.length < 10}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Get OTP <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button type="submit" className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white" disabled={loading || otp.length < 6}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Signup'
                    )}
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
                        onClick={handleResendOtp}
                        className="text-deep-forest p-0 h-auto"
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
                      className="text-muted-foreground p-0 h-auto text-xs"
                    >
                      Change Phone Number
                    </Button>
                  </div>
                </form>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-paper" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                type="button"
                className="w-full border-deep-forest/20 text-deep-forest hover:bg-stone-paper/50"
                onClick={() => setShowEmailSignup(true)}
                disabled={loading}
              >
                <Mail className="mr-2 h-4 w-4" />
                Sign Up with Email
              </Button>
            </div>
          ) : (
            // Email Signup
            <div className="space-y-4">
              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min. 6 characters)"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-paper" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or return to
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                type="button"
                className="w-full border-deep-forest/20 text-deep-forest hover:bg-stone-paper/50"
                onClick={() => setShowEmailSignup(false)}
                disabled={loading}
              >
                <Phone className="mr-2 h-4 w-4" />
                Sign Up with Phone
              </Button>
            </div>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/auth/login" className="font-semibold text-deep-forest hover:underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
