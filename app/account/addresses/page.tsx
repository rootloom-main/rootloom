import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AddressCard } from '@/components/account/address-card';

export default async function AddressesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: addresses } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Addresses</h1>
                <Link href="/account/addresses/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Add New Address
                    </Button>
                </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {addresses?.map((address) => (
                    <AddressCard key={address.id} address={address} />
                ))}
                {(!addresses || addresses.length === 0) && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <p>No addresses found.</p>
                        <p className="text-sm">Add a new address to speed up checkout.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
