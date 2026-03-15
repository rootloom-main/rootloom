'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithIdentifier, verifyOtpEx } from '../actions';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { createClient } from '@/lib/supabase/client';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0);
  const supabase = createClient();

  // Timer logic for resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    setLoading(true);
    try {
      const result = await signInWithIdentifier(identifier);
      if (result.error) throw new Error(result.error);

      setStep('otp');
      setTimer(60);
      toast.success(`Code sent to ${identifier}`);
    } catch (error: any) {
      const msg = error.message || 'Failed to send verification code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || otp.length !== 6) return;

    setLoading(true);
    try {
      const type = identifier.includes('@') ? 'email' : 'sms';
      const contactValue = identifier.includes('@') ? identifier : (identifier.startsWith('+') ? identifier : `+91${identifier}`);
      
      const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
        email: type === 'email' ? contactValue : undefined,
        phone: type === 'sms' ? contactValue : undefined,
        token: otp,
        type: type
      } as any);

      if (verifyError) throw verifyError;

      // Check if profile exists (to determine if it's a new user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session?.user?.id || '')
        .single();

      const next = searchParams?.get('next') || '/';

      if (!profile) {
        toast.success('Verification successful!');
        router.push(`/auth/onboarding?next=${encodeURIComponent(next)}`);
      } else {
        toast.success('Welcome back!');
        router.push(next);
      }
      
      // router.refresh() is called by the AuthProvider's listener
      // but we do it here as well for safety with server components
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Invalid or expired code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOtp();
    }
  }, [otp]);

  return (
    <div className="min-h-[85vh] w-full flex rounded-3xl overflow-hidden border border-stone-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] my-8 bg-white max-w-5xl mx-auto flex-col md:flex-row">
      {/* Visual Section */}
      <div className="hidden md:flex w-2/5 bg-deep-forest text-heirloom-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary opacity-20 blur-[120px] rounded-full"></div>
        </div>

        <div className="z-10 flex items-center gap-3">
          <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-stone-950 font-bold text-2xl shadow-xl italic">RL</div>
          <span className="text-2xl font-semibold tracking-tight">Root & Loom</span>
        </div>

        <div className="z-10 space-y-6">
          <h1 className="text-4xl font-medium tracking-tight leading-tight italic">Elegance in Every Thread.</h1>
          <p className="text-stone-400 text-lg leading-relaxed">
            Unified access to sustainable luxury. Your journey to conscious living starts with a single step.
          </p>
        </div>

        <div className="z-10 text-xs text-stone-500 font-medium tracking-widest uppercase">
          Crafted for the Contemporary Journey
        </div>
      </div>

      {/* Auth Section */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-16">
        <div className="w-full max-w-[380px] transition-all duration-500">
          {step === 'identifier' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-stone-900">Sign in or Create Account</h2>
                <p className="text-stone-500 text-base">Enter your email or mobile number to continue.</p>
              </div>

              <form onSubmit={handleIdentifierSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-14 px-5 text-lg rounded-2xl bg-stone-50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                    placeholder="Email or phone (+91...)"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={loading || !identifier}
                    className="w-full h-14 rounded-2xl text-lg font-medium shadow-stone-200 hover:shadow-xl transition-all"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/checkout?guest=true`)}
                    className="w-full h-14 rounded-2xl text-base font-medium border-stone-200 text-stone-600 hover:bg-stone-50"
                  >
                    Continue as Guest
                  </Button>
                </div>
              </form>

              <p className="text-xs text-center text-stone-400 leading-relaxed px-4">
                By entering, you agree to our <span className="text-stone-900 font-medium cursor-pointer hover:underline">Terms</span> and <span className="text-stone-900 font-medium cursor-pointer hover:underline">Privacy Policy</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-stone-900">Verify Identity</h2>
                <p className="text-stone-500 text-base">
                  Sent a 6-digit code to <span className="text-stone-900 font-semibold">{identifier}</span>
                  <button onClick={() => setStep('identifier')} className="ml-2 text-primary font-medium hover:underline text-sm">(Edit)</button>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-8 flex flex-col items-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  autoFocus
                  className="gap-3"
                >
                  <InputOTPGroup className="gap-2 sm:gap-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-14 w-11 sm:w-14 sm:h-16 text-xl rounded-xl border-stone-200 shadow-sm" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <div className="w-full space-y-4">
                  <Button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full h-14 rounded-2xl text-lg font-medium transition-all"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Sign in securely'}
                  </Button>

                  <div className="text-center">
                    {timer > 0 ? (
                      <span className="text-sm text-stone-400 font-medium italic">Resend code in {timer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleIdentifierSubmit}
                        className="text-sm text-primary font-semibold hover:underline"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 flex justify-center min-h-[70vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
