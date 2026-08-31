'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, ChevronLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithIdentifier, verifyOtpEx } from '@/app/auth/actions';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { sanitizeRedirectPath } from '@/lib/utils/redirect';

interface LoginModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  nextUrl?: string;
  source?: string; // 'product' | 'checkout' | 'profile'
  onSuccess?: () => void;
  refreshSession: () => Promise<void>;
}

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

export function LoginModal({ 
  isOpen, 
  onOpenChange, 
  nextUrl = '/', 
  source = 'profile',
  onSuccess, 
  refreshSession 
}: LoginModalProps) {
  const router = useRouter();
  const safeNextUrl = sanitizeRedirectPath(nextUrl, '/');
  const [step, setStep] = useState<'identifier' | 'otp' | 'welcome'>('identifier');
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [formattedContact, setFormattedContact] = useState('');
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

  // Reset steps when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small timeout to prevent UI jump during closing animation
      const t = setTimeout(() => {
        setStep('identifier');
        setOtp('');
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setStep('otp');
      setTimer(30); // 30s resend timer
      setFormattedContact(result.formattedContact || input);
      toast.success(result.type === 'sms' ? 'OTP sent to your mobile number.' : 'Secure verification code sent to your inbox.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
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
      const type = identifier.includes('@') ? 'email' : 'sms';
      const result = await verifyOtpEx(code, type, identifier.trim(), source);
      if (result.error) throw new Error(result.error);

      // Force session sync on the client context
      await refreshSession();

      if (onSuccess) {
        onSuccess();
      }

      if (result.isNewUser) {
        onOpenChange(false);
        router.refresh();
        setTimeout(() => {
          window.location.href = `/auth/onboarding?next=${encodeURIComponent(safeNextUrl)}`;
        }, 100);
      } else {
        toast.success('Welcome back!');
        onOpenChange(false);
        router.refresh();
        setTimeout(() => {
          window.location.href = safeNextUrl;
        }, 100);
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid or expired code');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('identifier');
    setOtp('');
  };

  const handleWelcomeRedirect = () => {
    onOpenChange(false);
    router.refresh();
    setTimeout(() => {
      window.location.href = safeNextUrl;
    }, 100);
  };

  const isCheckoutPath = safeNextUrl.includes('checkout');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 bg-white border border-stone-100 shadow-2xl font-sans">
        
        {step !== 'welcome' ? (
          <>
            <DialogHeader className="space-y-3 text-left">
              <DialogTitle className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
                {step === 'identifier' ? 'Welcome 👋' : 'Verify Account'}
              </DialogTitle>
              <DialogDescription className="text-stone-500 text-sm leading-relaxed">
                {step === 'identifier' ? (
                  'Enter your email address or mobile number to continue.'
                ) : (
                  <span>
                    We've sent a 6-digit verification code to{' '}
                    <span className="font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md inline-block whitespace-nowrap tracking-wide">
                      {formatDisplayContact(formattedContact)}
                    </span>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {step === 'identifier' ? (
              <form onSubmit={handleIdentifierSubmit} className="space-y-6 mt-4">
                <div className="space-y-4">
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-12 px-4 text-base rounded-xl bg-stone-50 border-stone-200 focus:ring-deep-forest focus:border-deep-forest transition-all"
                    placeholder="Email or mobile number"
                    required
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !identifier}
                  className="w-full h-12 bg-deep-forest hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 uppercase tracking-wider"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center">
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={(e) => handleVerifyOtp(undefined, e)} className="space-y-6 mt-4 flex flex-col items-center">
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
                  className="gap-2"
                >
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot 
                        key={i} 
                        index={i} 
                        className="h-12 w-10 sm:w-11 sm:h-12 text-lg rounded-lg border border-stone-200 shadow-sm focus:ring-2 focus:ring-deep-forest" 
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>

                <div className="w-full space-y-4">
                  <Button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full h-12 bg-deep-forest hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 uppercase tracking-wider"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verifying...
                      </span>
                    ) : 'Confirm and Log In'}
                  </Button>

                  <div className="flex items-center justify-between text-xs px-1">
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="text-stone-500 font-bold hover:text-stone-900 flex items-center gap-1 transition-colors"
                      disabled={loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Change Input
                    </button>

                    {timer > 0 ? (
                      <span className="text-stone-400 font-bold uppercase tracking-wider">Resend OTP ({timer}s)</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleIdentifierSubmit}
                        className="text-deep-forest font-bold uppercase tracking-wider hover:underline"
                        disabled={loading}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </>
        ) : (
          /* First Login Experience View */
          <div className="text-center py-6 space-y-6">
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
              onClick={handleWelcomeRedirect}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
