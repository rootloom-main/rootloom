'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, User, Phone, Mail, MapPin, Home, Globe, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { completeOnboarding } from './actions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { sanitizeRedirectPath } from '@/lib/utils/redirect';

interface OnboardingFormProps {
    initialName?: string;
    initialEmail?: string;
    initialPhone?: string;
    isCheckout?: boolean;
}

export function OnboardingForm({
    initialName = '',
    initialEmail,
    initialPhone,
    isCheckout = false,
}: OnboardingFormProps) {
    const [name, setName] = useState(initialName);
    
    // Clean formatted phone for input display (e.g. remove country code if present)
    const cleanInitialPhone = initialPhone ? initialPhone.replace(/^\+91/, '').replace(/\D/g, '') : '';
    const [phone, setPhone] = useState(cleanInitialPhone);
    const [customEmail, setCustomEmail] = useState(initialEmail || '');
    
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [loading, setLoading] = useState(false);
    
    const hasVerifiedEmail = !!initialEmail;
    const { refreshSession } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            toast.error('Please enter your full name.');
            return;
        }

        const cleanedPhone = phone.replace(/\D/g, '');
        if (cleanedPhone.length < 10) {
            toast.error('Please enter a valid 10-digit mobile number.');
            return;
        }

        // Email validation if entered for phone user
        const effectiveEmail = (hasVerifiedEmail ? initialEmail : customEmail).trim();
        if (effectiveEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail)) {
            toast.error('Please enter a valid email address.');
            return;
        }

        // Address validation (Strict when checking out, optional otherwise)
        const hasAddressDetails = addressLine1.trim() || city.trim() || state.trim() || postalCode.trim();
        
        if (isCheckout) {
            if (!addressLine1.trim()) {
                toast.error('Please enter your street address.');
                return;
            }
            if (!city.trim()) {
                toast.error('Please enter your city.');
                return;
            }
            if (!state.trim()) {
                toast.error('Please enter your state.');
                return;
            }
            if (postalCode.trim().length !== 6) {
                toast.error('Please enter a valid 6-digit Pincode.');
                return;
            }
        } else if (hasAddressDetails) {
            if (postalCode.trim() && postalCode.trim().length !== 6) {
                toast.error('Please enter a valid 6-digit Pincode.');
                return;
            }
        }

        setLoading(true);
        try {
            const hasCompleteAddress = addressLine1.trim() && city.trim() && state.trim() && postalCode.trim().length === 6;

            const result = await completeOnboarding({
                name: name.trim(),
                email: effectiveEmail || undefined,
                phone: cleanedPhone,
                address: hasCompleteAddress ? {
                    address_line1: addressLine1.trim(),
                    address_line2: addressLine2.trim() || '',
                    city: city.trim(),
                    state: state.trim(),
                    postal_code: postalCode.trim(),
                    country: 'India'
                } : undefined
            });

            if (result.error) throw new Error(result.error);

            toast.success(`Welcome to Root & Loom, ${name.trim().split(' ')[0]}! Profile setup complete.`);

            // 1. Force session sync on the client context
            await refreshSession();

            // 2. Refresh server-side components
            router.refresh();

            // 3. Retrieve target URL
            const searchParams = new URLSearchParams(window.location.search);
            const next = sanitizeRedirectPath(searchParams.get('next'), isCheckout ? '/checkout' : '/account');

            // 4. HARD REDIRECT - Most reliable way to ensure all state is fresh
            setTimeout(() => {
                window.location.href = next;
            }, 100);
        } catch (error: any) {
            toast.error(error.message || 'Failed to complete profile setup');
        } finally {
            setLoading(false);
        }
    };

    const isButtonDisabled = loading || !name.trim() || !phone.trim() || (
        isCheckout && (!addressLine1.trim() || !city.trim() || !state.trim() || postalCode.trim().length !== 6)
    );

    return (
        <Card className="w-full border-none shadow-none bg-transparent">
            <CardHeader className="space-y-2 p-0 mb-6">
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-serif">
                    {isCheckout ? 'Shipping & Profile Details' : 'Complete Your Profile'}
                </CardTitle>
                <CardDescription className="text-stone-500 text-sm leading-relaxed">
                    {isCheckout 
                        ? 'Please provide your name, phone number, and delivery address to proceed to payment.'
                        : 'Please provide your name and contact details to complete your account setup.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Logged in Email Info Badge */}
                    {hasVerifiedEmail && (
                        <div className="flex items-center gap-3 p-3.5 bg-stone-50 border border-stone-100 rounded-xl text-stone-600 text-sm shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                            <div className="flex-1 truncate">
                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Verified Email</p>
                                <p className="font-semibold text-stone-850 truncate">{initialEmail}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Name & Phone Group */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-stone-400" />
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    required
                                    className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                                    Mobile Number <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="10-digit mobile"
                                    required
                                    className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Email input for phone-authenticated users */}
                        {!hasVerifiedEmail && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                                    Email Address <span className="text-stone-400 font-normal lowercase">(optional for order receipts)</span>
                                </label>
                                <Input
                                    type="email"
                                    value={customEmail}
                                    onChange={(e) => setCustomEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                />
                            </div>
                        )}

                        {/* Address Section */}
                        <div className="pt-2">
                            <div className="mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-stone-500" />
                                    {isCheckout ? 'Delivery Address' : 'Default Delivery Address (Optional)'}
                                    {isCheckout && <span className="text-red-500">*</span>}
                                </h4>
                            </div>

                            <div className="space-y-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-stone-500">
                                        Flat, House no., Building, Company, Apartment
                                    </label>
                                    <Input
                                        value={addressLine1}
                                        onChange={(e) => setAddressLine1(e.target.value)}
                                        placeholder="Area and street details"
                                        required={isCheckout}
                                        className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-stone-500 flex items-center gap-1.5">
                                        <Home className="w-3 h-3 text-stone-400" />
                                        Landmark / Locality (Optional)
                                    </label>
                                    <Input
                                        value={addressLine2}
                                        onChange={(e) => setAddressLine2(e.target.value)}
                                        placeholder="e.g. Near City Center"
                                        className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                    />
                                </div>

                                {/* City, State, Pincode Group */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1.5 col-span-1">
                                        <label className="text-[11px] font-semibold text-stone-500">
                                            City
                                        </label>
                                        <Input
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="City"
                                            required={isCheckout}
                                            className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5 col-span-1">
                                        <label className="text-[11px] font-semibold text-stone-500">
                                            State
                                        </label>
                                        <Input
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            placeholder="State"
                                            required={isCheckout}
                                            className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                        <label className="text-[11px] font-semibold text-stone-500">
                                            Pincode
                                        </label>
                                        <Input
                                            maxLength={6}
                                            value={postalCode}
                                            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                                            placeholder="6-digit PIN"
                                            required={isCheckout}
                                            className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Country (Read-only India) */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-stone-500 flex items-center gap-1.5">
                                        <Globe className="w-3 h-3 text-stone-400" />
                                        Country
                                    </label>
                                    <Input
                                        value="India"
                                        disabled
                                        className="rounded-xl h-11 px-4 bg-stone-100 border-stone-200 text-stone-500 select-none shadow-sm cursor-not-allowed text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-14 bg-deep-forest hover:bg-slate-900 text-white rounded-xl text-base sm:text-lg font-bold shadow-lg shadow-deep-forest/15 hover:shadow-xl transition-all duration-300 uppercase tracking-wider mt-4"
                        disabled={isButtonDisabled}
                    >
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                            <>
                                {isCheckout ? 'Continue to Payment' : 'Complete Setup'}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

