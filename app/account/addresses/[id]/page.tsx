import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AddressForm } from '@/components/account/address-form';

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    if (!user) {
        redirect('/auth/login');
    }

    const { data: address } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (!address) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Edit Address</h1>
            <AddressForm initialData={{ 
                ...address, 
                address_line2: address.address_line2 ?? undefined,
                type: address.type ?? 'Home'
            }} />
        </div>
    );
}
