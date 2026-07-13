'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithIdentifier, verifyOtpEx } from '../actions';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { CheckoutProgressIndicator } from '@/components/checkout/checkout-progress-indicator';
import { sanitizeRedirectPath } from '@/lib/utils/redirect';

function LoginPageContent() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'identifier' | 'otp' | 'email_sent'>('identifier');
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(0);

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

    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithIdentifier(identifier.trim());
      if (result.error) throw new Error(result.error);

      setStep('otp');
      setTimer(30);
      toast.success(`Secure verification code sent to your inbox.`);
    } catch (error: any) {
      const msg = error.message || 'Failed to send verification code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (submittedOtp?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = submittedOtp ?? otp;
    if (loading || code.length !== 6) return;

    setLoading(true);
    try {
      const source = searchParams?.get('source') || 'profile';
      const result = await verifyOtpEx(code, 'email', identifier.trim(), source);
      
      if (result.error) throw new Error(result.error);

      // 1. Force session sync on the client context
      await refreshSession();

      // 2. Refresh server-side components
      router.refresh();

      if (result.isNewUser) {
        setShowWelcome(true);
      } else {
        toast.success('Welcome back!');
        // Standard redirection
        const next = sanitizeRedirectPath(searchParams?.get('next'), '/');
        setTimeout(() => {
          window.location.href = next;
        }, 100);
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid or expired code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  if (showWelcome) {
    const next = sanitizeRedirectPath(searchParams?.get('next'), '/');
    const isCheckoutPath = next.includes('checkout');
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 py-8 max-w-6xl mx-auto w-full bg-stone-50/20">
        <div className="w-full flex rounded-3xl overflow-hidden border border-stone-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white max-w-md mx-auto p-8 flex-col items-center text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200/50 shadow-inner animate-bounce">
            <Sparkles className="h-8 w-8 text-amber-500 fill-amber-100" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold font-serif text-stone-900">🎉 Welcome!</h3>
            <p className="text-stone-500 text-sm leading-relaxed">
              Your account has been successfully created.
            </p>
          </div>

          <Button
            onClick={() => {
              window.location.href = next;
            }}
            className="w-full h-12 bg-deep-forest hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-deep-forest/10 hover:shadow-xl transition-all duration-300 uppercase tracking-wider"
          >
            {isCheckoutPath ? (
              <span className="flex items-center justify-center">
                Continue Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            ) : (
              <span className="flex items-center justify-center">
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 py-8 max-w-6xl mx-auto w-full bg-stone-50/20">
      <CheckoutProgressIndicator currentStep="account" />
      
      <div className="w-full flex rounded-3xl overflow-hidden border border-stone-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-white max-w-5xl mx-auto flex-col md:flex-row">
        {/* Visual Section */}
        <div className="hidden md:flex w-2/5 bg-deep-forest text-heirloom-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary opacity-20 blur-[120px] rounded-full"></div>
          </div>

          <div className="z-10 flex items-center gap-3">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-stone-950 font-bold text-2xl shadow-xl italic">RL</div>
            <span className="text-2xl font-semibold tracking-tight font-serif">Root & Loom</span>
          </div>

          <div className="z-10 space-y-6">
            <h1 className="text-4xl font-medium tracking-tight leading-tight italic font-serif">Continue to checkout securely.</h1>
            <p className="text-stone-400 text-lg leading-relaxed font-sans">
              Authenticate with your email using a one-time verification code. Secure, fast, and no password required.
            </p>
          </div>

          <div className="z-10 text-xs text-stone-500 font-medium tracking-widest uppercase">
            Rooted in Vibes. Loomed for the Journey.
          </div>
        </div>

        {/* Auth Section */}
        <div className="flex-1 flex items-center justify-center p-8 sm:p-16">
          <div className="w-full max-w-[380px] transition-all duration-500">
            {step === 'identifier' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Continue Secure Checkout</h2>
                  <p className="text-stone-500 text-sm">Enter your email address to continue to payment and shipping.</p>
                </div>

                <form onSubmit={handleIdentifierSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      type="email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="h-14 px-5 text-lg rounded-2xl bg-stone-50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                      placeholder="Enter your email address"
                      required
                      autoFocus
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={loading || !identifier}
                      className="w-full h-14 bg-deep-forest hover:bg-slate-900 text-white rounded-2xl text-lg font-bold shadow-lg shadow-deep-forest/15 hover:shadow-xl transition-all duration-300 uppercase tracking-wider"
                    >
                      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                        <>
                          Continue
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <p className="text-[11px] text-center text-stone-400 leading-relaxed px-4">
                  By continuing, you agree to our <span className="text-stone-950 font-bold hover:underline cursor-pointer">Terms of Service</span> and <span className="text-stone-950 font-bold hover:underline cursor-pointer">Privacy Policy</span>.
                </p>
              </div>
            ) : step === 'otp' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Verify Account</h2>
                  <p className="text-stone-500 text-sm">
                    We sent a 6-digit code to <span className="text-stone-950 font-bold break-all">{identifier}</span>
                    <button type="button" onClick={() => { setStep('identifier'); setOtp(''); }} className="ml-2 text-deep-forest font-bold hover:underline text-xs" disabled={loading}>(Edit)</button>
                  </p>
                </div>

                <form onSubmit={(e) => handleVerifyOtp(undefined, e)} className="space-y-8 flex flex-col items-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      if (value.length === 6) {
                        void handleVerifyOtp(value);
                      }
                    }}
                    autoFocus
                    disabled={loading}
                    className="gap-3"
                  >
                    <InputOTPGroup className="gap-2 sm:gap-3">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-14 w-11 sm:w-14 sm:h-16 text-xl rounded-xl border-stone-200 shadow-sm focus:ring-2 focus:ring-deep-forest" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>

                  <div className="w-full space-y-4">
                    <Button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-full h-14 bg-deep-forest hover:bg-slate-900 text-white rounded-2xl text-lg font-bold shadow-lg shadow-deep-forest/15 hover:shadow-xl transition-all duration-300 uppercase tracking-wider"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Verifying...
                        </div>
                      ) : 'Confirm and Log In'}
                    </Button>

                    <div className="text-center">
                      {timer > 0 ? (
                        <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Resend code in {timer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleIdentifierSubmit}
                          className="text-xs text-deep-forest font-bold uppercase tracking-wider hover:underline"
                          disabled={loading}
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-10 w-10 animate-spin text-stone-300" />
                </div>
                <h2 className="text-2xl font-semibold text-stone-900 font-serif">Verifying session...</h2>
                <p className="text-stone-500 text-sm">Please wait while we secure your session details.</p>
              </div>
            )}
          </div>
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
