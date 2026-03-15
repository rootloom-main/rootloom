import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { CampaignsTable } from '@/components/admin/campaigns-table';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCampaignsPage() {
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

    const { data: campaigns, error } = await (supabase as any).from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching campaigns:', error);
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-display">Campaigns</h1>
                    <p className="text-gray-500 mt-1">Send and manage WhatsApp marketing broadcasts.</p>
                </div>
                <Link
                    href="/admin/marketing/campaigns/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    New Campaign
                </Link>
            </div>

            <CampaignsTable campaigns={campaigns || []} />
        </div>
    );
}
