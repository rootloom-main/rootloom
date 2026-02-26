import { createSSRClient } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { AddressForm } from '@/components/account/address-form';

export default async function NewAddressPage() {
    const supabase = await createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Add New Address</h1>
            <AddressForm />
        </div>
    );
}
