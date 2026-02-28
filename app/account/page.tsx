import { redirect } from 'next/navigation';
import { createSSRClient, getCurrentUser } from '@/lib/utils/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, User, ArrowRight, CreditCard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default async function AccountPage() {
  const supabase = await createSSRClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: any | null };

  // Fetch recent orders (limit 1 for preview)
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3) as { data: any[] | null };

  const recentOrder = orders?.[0];

  // Fetch default address
  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false }) as { data: any[] | null };

  const defaultAddress = addresses?.find(a => a.is_default) || addresses?.[0];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-serif font-medium text-deep-forest mb-2">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-slate-500">
          From your account dashboard you can view your recent orders, manage your shipping and billing addresses, and edit your password and account details.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Order Preview */}
        <Card className="border-stone-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                <Package size={20} />
                Recent Order
              </CardTitle>
              {recentOrder && (
                <Link href={`/account/orders/${recentOrder.id}`} className="text-sm text-deep-forest hover:underline flex items-center">
                  View
                  <ArrowRight size={14} className="ml-1" />
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {recentOrder ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Order #</span>
                  <span className="font-medium">{recentOrder.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium">{new Date(recentOrder.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 capitalize">
                    {recentOrder.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t border-stone-100">
                  <span>Total</span>
                  <span>₹{recentOrder.total_amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 mb-4">No recent orders found.</p>
                <Link href="/shop">
                  <Button variant="outline" size="sm">Start Shopping</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Snapshot */}
        <Card className="border-stone-100 shadow-sm">
          <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                <User size={20} />
                Profile Details
              </CardTitle>
              <Link href="/account/profile" className="text-sm text-[#8c5a45] hover:underline">
                Edit
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                <User size={20} />
              </div>
              <div>
                <p className="font-medium text-deep-forest">{profile?.full_name || 'No Name Set'}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                <div className="font-semibold text-xs">+91</div>
              </div>
              <div>
                <p className="font-medium text-deep-forest">{profile?.phone || 'No Phone Set'}</p>
                <p className="text-sm text-slate-500">Mobile Number</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Address Preview (Placeholder) */}
        <Card className="border-stone-100 shadow-sm md:col-span-2">
          <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                <MapPin size={20} />
                Primary Address
              </CardTitle>
              <Link href="/account/addresses" className="text-sm text-[#8c5a45] hover:underline">
                Manage Addresses
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {defaultAddress ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-deep-forest">{defaultAddress.full_name}</p>
                  <p className="text-sm text-slate-600">
                    {defaultAddress.address_line1}{defaultAddress.address_line2 ? `, ${defaultAddress.address_line2}` : ''}
                  </p>
                  <p className="text-sm text-slate-600">
                    {defaultAddress.city}, {defaultAddress.state} {defaultAddress.postal_code}
                  </p>
                  <p className="text-sm text-slate-600">{defaultAddress.phone}</p>
                </div>
                <Link href="/account/addresses">
                  <Button variant="outline" size="sm">Edit Address</Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <p className="text-slate-500">You haven&apos;t set a default shipping address yet.</p>
                <Link href="/account/addresses/new">
                  <Button variant="outline" size="sm">Add New Address</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
