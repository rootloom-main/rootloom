import { getCurrentUser } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CampaignForm } from '@/components/admin/campaign-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewCampaignPage() {
    const supabase = await createAdminClient();
    const user = await getCurrentUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    return (
        <div className="container mx-auto px-6 py-8 pb-20">
            <div className="mb-10">
                <Link
                    href="/admin/marketing/campaigns"
                    className="group mb-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Campaigns
                </Link>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 font-display">New Broadcast</h1>
                <p className="mt-2 text-lg text-gray-500">Design your WhatsApp marketing campaign and reach your audience.</p>
            </div>

            <CampaignForm />
        </div>
    );
}
