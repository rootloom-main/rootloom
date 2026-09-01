import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './onboarding-form';
import { Loader2 } from 'lucide-react';
import { CheckoutProgressIndicator } from '@/components/checkout/checkout-progress-indicator';

interface PageProps {
    searchParams: Promise<{ next?: string }>;
}

export default async function OnboardingPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    const resolvedSearchParams = await searchParams;
    const next = resolvedSearchParams?.next || '/';
    const isCheckout = next.includes('checkout');

    // Double check if onboarding is already complete
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.full_name?.trim() && profile?.phone?.trim()) {
        redirect(next);
    }

    const initialName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
    const initialEmail = user.email || profile?.email || undefined;
    const initialPhone = user.phone || profile?.phone || user.user_metadata?.phone || undefined;

    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 py-8 max-w-6xl mx-auto w-full">
            {isCheckout && (
                <div className="w-full mb-2">
                    <CheckoutProgressIndicator currentStep="address" />
                </div>
            )}
            
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-100 flex flex-col md:flex-row">
                <div className="hidden md:flex w-1/3 bg-deep-forest p-8 sm:p-10 flex-col justify-between text-heirloom-white relative">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary to-transparent"></div>
                    <div className="z-10 text-2xl font-bold italic tracking-tighter">RL</div>
                    <div className="z-10 space-y-3">
                        <h3 className="text-2xl font-medium font-serif leading-tight">
                            {isCheckout ? 'Fast, Secure Delivery' : 'Welcome to Root & Loom'}
                        </h3>
                        <p className="text-xs text-stone-300/80 font-medium leading-relaxed">
                            {isCheckout 
                                ? 'Complete your delivery details to proceed to secure payment.' 
                                : 'Set up your profile once and enjoy effortless shopping.'}
                        </p>
                    </div>
                    <div className="z-10 text-[10px] text-stone-400 font-medium tracking-widest uppercase">
                        Loomed for the Journey.
                    </div>
                </div>
                
                <div className="flex-1 p-6 sm:p-10">
                    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-stone-300" /></div>}>
                        <OnboardingForm 
                            initialName={initialName}
                            initialEmail={initialEmail} 
                            initialPhone={initialPhone} 
                            isCheckout={isCheckout}
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

