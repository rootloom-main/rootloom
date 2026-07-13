'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight, User, Phone, MapPin, Home, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { completeOnboarding } from './actions';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { sanitizeRedirectPath } from '@/lib/utils/redirect';

export function OnboardingForm({ initialEmail }: { initialEmail?: string }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [loading, setLoading] = useState(false);
    
    const email = initialEmail || '';
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

        setLoading(true);
        try {
            const result = await completeOnboarding({
                name: name.trim(),
                email,
                phone: cleanedPhone,
                address: {
                    address_line1: addressLine1.trim(),
                    address_line2: addressLine2.trim() || '',
                    city: city.trim(),
                    state: state.trim(),
                    postal_code: postalCode.trim(),
                    country: 'India'
                }
            });

            if (result.error) throw new Error(result.error);

            toast.success(`Welcome to Root & Loom, ${name.trim().split(' ')[0]}! Your address has been saved.`);

            // 1. Force session sync on the client context
            await refreshSession();

            // 2. Refresh server-side components
            router.refresh();

            // 3. Retrieve target URL
            const searchParams = new URLSearchParams(window.location.search);
            const next = sanitizeRedirectPath(searchParams.get('next'), '/');

            // 4. HARD REDIRECT - Most reliable way to ensure all state is fresh
            setTimeout(() => {
                window.location.href = next;
            }, 100);
        } catch (error: any) {
            toast.error(error.message || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full border-none shadow-none bg-transparent">
            <CardHeader className="space-y-2 p-0 mb-6">
                <CardTitle className="text-3xl font-bold tracking-tight text-stone-900 font-serif">Shipping & Profile Details</CardTitle>
                <CardDescription className="text-stone-500 text-sm leading-relaxed">
                    Please provide your name, phone number, and shipping address to set up your account and proceed to payment.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Logged in Email Info Badge */}
                    {email && (
                        <div className="flex items-center gap-3 p-3.5 bg-stone-50 border border-stone-100 rounded-xl text-stone-600 text-sm shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                            <div className="flex-1 truncate">
                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Verified Email</p>
                                <p className="font-semibold text-stone-850 truncate">{email}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Name & Phone Group */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-stone-400" />
                                    Full Name
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
                                    Mobile Number
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

                        {/* Address Lines */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                                Flat, House no., Building, Company, Apartment
                            </label>
                            <Input
                                value={addressLine1}
                                onChange={(e) => setAddressLine1(e.target.value)}
                                placeholder="Area and street details"
                                required
                                className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <Home className="w-3.5 h-3.5 text-stone-400" />
                                Landmark / Locality (Optional)
                            </label>
                            <Input
                                value={addressLine2}
                                onChange={(e) => setAddressLine2(e.target.value)}
                                placeholder="e.g. Near Apollo Hospital"
                                className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                            />
                        </div>

                        {/* City, State, Pincode Group */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                    City
                                </label>
                                <Input
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder="City"
                                    required
                                    className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                />
                            </div>
                            <div className="space-y-1.5 col-span-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                    State
                                </label>
                                <Input
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    placeholder="State"
                                    required
                                    className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                />
                            </div>
                            <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                    Pincode
                                </label>
                                <Input
                                    maxLength={6}
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="6-digit PIN"
                                    required
                                    className="rounded-xl h-12 px-4 bg-stone-50/50 border-stone-200 focus:ring-primary focus:border-primary transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Country (Read-only India) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-stone-400" />
                                Country
                            </label>
                            <Input
                                value="India"
                                disabled
                                className="rounded-xl h-12 px-4 bg-stone-100 border-stone-200 text-stone-500 select-none shadow-sm cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-14 bg-deep-forest hover:bg-slate-900 text-white rounded-xl text-lg font-bold shadow-lg shadow-deep-forest/15 hover:shadow-xl transition-all duration-300 uppercase tracking-wider mt-4"
                        disabled={loading || !name.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim()}
                    >
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                            <>
                                Continue to Payment
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
