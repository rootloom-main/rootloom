'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { completeOnboarding } from './actions';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function OnboardingForm({ initialEmail }: { initialEmail?: string }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState(initialEmail || '');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            const result = await completeOnboarding({ name, email, phone });
            if (result.error) throw new Error(result.error);

            toast.success(`Welcome to Root & Loom, ${name.split(' ')[0]}! 👋`);

            const supabase = createClient();
            await supabase.auth.getSession();
            router.refresh();

            const next = searchParams?.get('next') || '/';
            router.push(next);
        } catch (error: any) {
            toast.error(error.message || 'Failed to complete onboarding');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full border-none shadow-none">
            <CardHeader className="space-y-2 p-0 mb-8">
                <CardTitle className="text-3xl font-semibold tracking-tight">Welcome to Root & Loom</CardTitle>
                <CardDescription className="text-stone-500 text-base">
                    Just a few details to get started with your luxury experience.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Full Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                required
                                className="rounded-xl h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700">Email Address</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="john@example.com"
                                required
                                className="rounded-xl h-12"
                            />
                        </div>

                        {!initialEmail && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-stone-700">Phone Number (Optional)</label>
                                <Input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91..."
                                    className="rounded-xl h-12"
                                />
                                <p className="text-[10px] text-stone-400 italic">Adding a phone number helps secure your account.</p>
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-6 text-base shadow-sm font-medium"
                        disabled={loading || !name}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Start Exploring'}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
