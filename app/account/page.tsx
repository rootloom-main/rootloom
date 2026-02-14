import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Package, MapPin, Heart } from 'lucide-react';

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-gray-600">
              <span className="font-semibold">Name:</span> {profile?.full_name || 'Not set'}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">Email:</span> {user.email}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">Phone:</span> {profile?.phone || 'Not set'}
            </p>
          </CardContent>
        </Card>

        <Link href="/account/wishlist">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                My Wishlist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View your saved items</p>
              <Button className="mt-4 w-full" variant="outline">View Wishlist</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/orders">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                My Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View and track your orders</p>
              <Button className="mt-4 w-full">View Orders</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/addresses">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage your saved addresses</p>
              <Button className="mt-4 w-full" variant="outline">
                Manage Addresses
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
