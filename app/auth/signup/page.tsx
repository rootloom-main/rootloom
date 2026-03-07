'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

function SignupPageContent() {
  // ... existing SignupPage content ...
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<'details' | 'otp'>('details');

  // Form State
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const isEmail = identifier.includes('@');

  // Auto-submit OTP
  useEffect(() => {
    if (otp.length === 6 && step === 'otp') {
      handleVerifyOtp(new Event('submit') as any);
    }
  }, [otp]);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !identifier || !password) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      if (isEmail) {
        // Email Signup - Send OTP first
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier,
        });

        if (error) throw error;

        setStep('otp');
        toast.success('OTP sent to verify your email');

      } else {
        // Phone Signup - Send OTP first
        let formattedPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+91' + formattedPhone;
        }

        if (formattedPhone.length < 12) {
          toast.error('Please enter a valid mobile number');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });

        if (error) throw error;

        setStep('otp');
        toast.success('OTP sent to verify your number');
      }
    } catch (error: any) {
      if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
        toast.error('Too many requests. Please wait a minute before trying again.');
      } else {
        toast.error(error.message || 'Signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    if (e.preventDefault) e.preventDefault();
    if (loading || otp.length !== 6) return;

    setLoading(true);
    let formattedPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }

    try {
      if (isEmail) {
        // 1. Verify Email OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: identifier,
          token: otp,
          type: 'email',
        });

        if (verifyError) throw verifyError;
      } else {
        // 1. Verify Phone OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'sms',
        });

        if (verifyError) throw verifyError;
      }

      // 2. Update user metadata with name and password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
        data: {
          full_name: name
        }
      });
      // We don't block on updateError if verify succeeded, just log it.
      if (updateError) console.error("Failed to update password/name on phone signup:", updateError);

      toast.success('Account created successfully!');
      const next = searchParams?.get('next') || '/';
      router.push(next);
      router.refresh();

    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || !identifier) return;
    setLoading(true);

    try {
      if (isEmail) {
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier,
        });
        if (error) throw error;
        toast.success('A new OTP has been sent to your email');
      } else {
        let formattedPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = '+91' + formattedPhone;
        }
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        if (error) throw error;
        toast.success('A new OTP has been sent to your number');
      }
      setOtp('');
    } catch (error: any) {
      if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
        toast.error('Too many requests. Please try again later.');
      } else {
        toast.error(error.message || 'Failed to resend OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex rounded-2xl overflow-hidden border border-stone-100 shadow-2xl my-8 bg-white max-w-6xl mx-auto">
      {/* Left side - Brand/Image */}
      <div className="hidden lg:flex w-1/2 bg-deep-forest text-heirloom-white relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
        </div>
        <div className="z-10 flex items-center gap-3">
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-stone-950 font-bold text-2xl">R</div>
          <span className="text-2xl font-bold tracking-tight">Root & Loom</span>
        </div>

        <div className="z-10 max-w-md space-y-4">
          <h1 className="text-4xl font-medium tracking-tight leading-tight">Join our exclusive community.</h1>
          <p className="text-stone-400 text-lg">Create an account to unlock personalized recommendations, seamless checkout, and access to members-only collections.</p>
        </div>

        <div className="z-10 text-sm text-stone-500">
          © {new Date().getFullYear()} Root & Loom. All rights reserved.
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 xl:p-16 bg-white relative">
        <div className="w-full max-w-[400px]">
          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
              {step === 'details' ? 'Create an account' : 'Verify identity'}
            </h2>
            <div className="text-stone-500 text-sm">
              {step === 'details' && 'Start your journey with Root & Loom.'}
              {step === 'otp' && (
                <div>
                  Enter the 6-digit OTP sent to <span className="font-semibold text-stone-900">{identifier}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {step === 'details' && (
              <form onSubmit={handleSignupSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-stone-700">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="focus-visible:ring-primary focus-visible:border-primary px-4 py-6 text-base bg-stone-50 border-stone-200"
                      placeholder="Enter your first and last name"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-stone-700">Mobile number or email</Label>
                    <Input
                      id="identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="focus-visible:ring-primary focus-visible:border-primary px-4 py-6 text-base bg-stone-50 border-stone-200"
                      placeholder="Email address or phone number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-stone-700">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="focus-visible:ring-primary focus-visible:border-primary px-4 py-6 text-base bg-stone-50 border-stone-200"
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full py-6 text-base shadow-sm font-medium transition-all" disabled={loading || !name || !identifier || !password}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isEmail ? 'Continue with email' : 'Verify mobile number')}
                </Button>

                <div className="text-xs text-center text-stone-500 mt-6">
                  By creating an account, you agree to Root &amp; Loom&apos;s{' '}
                  <Link href="/terms" className="text-stone-900 underline underline-offset-2 hover:text-primary transition-colors">Terms of Service</Link> and{' '}
                  <Link href="/privacy-policy" className="text-stone-900 underline underline-offset-2 hover:text-primary transition-colors">Privacy Policy</Link>.
                </div>

                <div className="mt-8">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-stone-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-4 text-stone-500 font-medium tracking-wide">
                        Already a member?
                      </span>
                    </div>
                  </div>

                  <Link href={`/auth/login?next=${encodeURIComponent(searchParams?.get('next') || '/')}`}>
                    <Button variant="outline" className="w-full py-6 border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 hover:text-stone-900 transition-all font-medium text-base">
                      Sign in directly
                    </Button>
                  </Link>
                </div>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-8">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="h-12 w-12 text-lg rounded-md border-stone-200" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-lg rounded-md border-stone-200" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-lg rounded-md border-stone-200" />
                      <InputOTPSlot index={3} className="h-12 w-12 text-lg rounded-md border-stone-200" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-lg rounded-md border-stone-200" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-lg rounded-md border-stone-200" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="space-y-4">
                  <Button type="submit" className="w-full py-6 text-base shadow-sm font-medium transition-all" disabled={loading || otp.length < 6}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Complete sign up'}
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={handleResendOtp}
                      className="text-sm text-stone-500 hover:text-stone-900 font-medium"
                    >
                      Wait, resend code
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 flex justify-center min-h-[70vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SignupPageContent />
    </Suspense>
  );
}
