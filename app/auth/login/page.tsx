'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ChevronLeft } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<'identifier' | 'password' | 'otp'>('identifier');
  const [loading, setLoading] = useState(false);

  // Form State
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

  // Step 1: Identifier Submit
  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    if (isEmail) {
      setStep('password');
    } else {
      // It's a phone number. Send OTP
      let formattedPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+91' + formattedPhone; // default to +91 just in case
      }

      if (formattedPhone.length < 12) {
        toast.error('Please enter a valid mobile number');
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });

        if (error) {
          if (error.message.includes('rate limit')) {
            throw new Error('Too many requests. Please try again later.');
          }
          throw error;
        }

        setStep('otp');
        toast.success('OTP sent to your number');
      } catch (error: any) {
        toast.error(error.message || 'Failed to send OTP');
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 2a: Password Submit (for Email)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      if (error) {
        // If user not found or invalid credentials
        throw error;
      }

      toast.success('Logged in successfully!');
      const next = searchParams?.get('next') || '/';
      router.push(next);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Step 2b: OTP Submit (for Phone)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    if (e.preventDefault) e.preventDefault();
    if (loading || otp.length !== 6) return;

    setLoading(true);
    let formattedPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      toast.success('Logged in successfully!');
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

  return (
    <div className="min-h-[85vh] w-full flex rounded-2xl overflow-hidden border border-stone-100 shadow-2xl my-8 bg-white max-w-6xl mx-auto">
      {/* Left side - Brand/Image */}
      <div className="hidden lg:flex w-1/2 bg-stone-950 text-white relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
        </div>
        <div className="z-10 flex items-center gap-3">
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-stone-950 font-bold text-2xl">R</div>
          <span className="text-2xl font-bold tracking-tight">Root & Loom</span>
        </div>

        <div className="z-10 max-w-md space-y-4">
          <h1 className="text-4xl font-medium tracking-tight leading-tight">Welcome back to your curated collection.</h1>
          <p className="text-stone-400 text-lg">Sign in to access your wishlist, track your orders, and discover new arrivals tailored just for you.</p>
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
              {step === 'identifier' && 'Sign in'}
              {step === 'password' && 'Welcome back'}
              {step === 'otp' && 'Verify identity'}
            </h2>
            <div className="text-stone-500 text-sm">
              {step === 'identifier' && 'Enter your email or mobile phone number.'}
              {step === 'password' && (
                <div className="flex items-center gap-2">
                  <span>{identifier}</span>
                  <Button variant="link" onClick={() => setStep('identifier')} className="h-auto p-0 px-1 text-primary font-medium hover:underline">
                    (Change)
                  </Button>
                </div>
              )}
              {step === 'otp' && (
                <div>
                  Enter the 6-digit OTP sent to <span className="font-semibold text-stone-900">{identifier}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {step === 'identifier' && (
              <form onSubmit={handleIdentifierSubmit} className="space-y-6">
                <div className="space-y-2 relative">
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="focus-visible:ring-primary focus-visible:border-primary px-4 py-6 text-base bg-stone-50 border-stone-200"
                    placeholder="Email or mobile number"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full py-6 text-base shadow-sm font-medium transition-all" disabled={loading || !identifier}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <div className="text-xs text-center text-stone-500 mt-6">
                  By continuing, you agree to Root &amp; Loom&apos;s{' '}
                  <Link href="/terms" className="text-stone-900 underline underline-offset-2 hover:text-primary transition-colors">Terms of Service</Link> and{' '}
                  <Link href="/privacy-policy" className="text-stone-900 underline underline-offset-2 hover:text-primary transition-colors">Privacy Policy</Link>.
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="password" className="text-stone-700">Password</Label>
                    <Link href="/auth/forgot-password" className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus-visible:ring-primary focus-visible:border-primary px-4 py-6 text-base bg-stone-50 border-stone-200"
                    placeholder="••••••••"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full py-6 text-base shadow-sm font-medium transition-all" disabled={loading || !password}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in securely'}
                </Button>
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
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Sign in'}
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setStep('identifier');
                        setOtp('');
                      }}
                      className="text-sm text-stone-500 hover:text-stone-900 font-medium"
                    >
                      Wait, resend code
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {step === 'identifier' && (
            <div className="mt-10">
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-stone-500 font-medium tracking-wide">
                    New to Root & Loom?
                  </span>
                </div>
              </div>

              <Link href={`/auth/signup?next=${encodeURIComponent(searchParams?.get('next') || '/')}`}>
                <Button variant="outline" className="w-full py-6 border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 hover:text-stone-900 transition-all font-medium text-base">
                  Create an account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 flex justify-center min-h-[70vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
