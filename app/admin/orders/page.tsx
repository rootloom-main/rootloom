import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { AdminOrdersTable } from '@/components/admin/admin-orders-table';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const supabase = await createSSRClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Verify Admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: any | null };

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    redirect('/');
  }

  // Fetch orders with profile data
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (email, full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    // You might want to handle this UI gracefully
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Orders ({orders?.length || 0})</h1>
          <p className="text-gray-500">Manage and fulfill customer orders.</p>
        </div>
      </div>

      <AdminOrdersTable orders={orders || []} />
    </div>
  );
}
