import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { AdminReviewsTable } from '@/components/admin/admin-reviews-table';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: any | null };

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    // Attempt to fetch reviews
    const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
      *,
      profiles (full_name, email),
      products (name, slug)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Product Reviews</h1>
                <p className="text-gray-500">Manage, search, and approve customer feedback.</p>
            </div>

            <AdminReviewsTable reviews={reviews || []} />
        </div>
    );
}
