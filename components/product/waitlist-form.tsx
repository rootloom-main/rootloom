'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function WaitlistForm({
    productId,
    variantId,
}: {
    productId: string;
    variantId?: string | null;
}) {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    variantId,
                    email: email || undefined,
                    phone: phone || undefined,
                }),
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Could not join waitlist');
            }

            toast.success('We will let you know when this is back.');
            setEmail('');
            setPhone('');
        } catch (error: any) {
            toast.error(error.message || 'Could not join waitlist');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-stone-700">Join the restock waitlist</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="bg-white"
                />
                <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="WhatsApp number"
                    className="bg-white"
                />
            </div>
            <Button
                type="button"
                onClick={submit}
                disabled={loading || (!email && !phone)}
                className="h-11 rounded-md bg-deep-forest text-white hover:bg-deep-forest/90"
            >
                {loading ? 'Joining...' : 'Notify Me'}
            </Button>
        </div>
    );
}
