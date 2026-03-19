import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './onboarding-form';
import { Loader2 } from 'lucide-react';

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Double check if profile exists (protection against manual URL access)
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

    if (profile) {
        redirect('/');
    }

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-100 flex flex-col md:flex-row">
                <div className="hidden md:flex w-1/3 bg-deep-forest p-8 flex-col justify-between text-heirloom-white relative">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary to-transparent"></div>
                    <div className="z-10 text-2xl font-bold italic tracking-tighter">RL</div>
                    <div className="z-10">
                        <h3 className="text-xl font-medium mb-2">Rooted in Vibes</h3>
                        <p className="text-xs text-stone-400">Loomed for the Journey.</p>
                    </div>
                </div>
                <div className="flex-1 p-8 sm:p-12">
                    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-stone-300" /></div>}>
                        <OnboardingForm initialEmail={user.email} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
