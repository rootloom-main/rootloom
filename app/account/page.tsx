import { redirect } from 'next/navigation';
import { createSSRClient, getCurrentUser } from '@/lib/utils/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Package, MapPin, User, ArrowRight, CreditCard, Heart, 
  ShieldCheck, Bell, Plus, CheckCircle2, Circle, AlertCircle, ShoppingBag, Eye 
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatPrice, formatDate } from '@/lib/utils/format';
import Image from 'next/image';

function formatPhoneDisplay(raw: string | null | undefined): string {
    if (!raw) return 'Not Provided';
    const d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
    if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
    if (d.length > 10) return `+${d}`;
    return raw;
}

function formatMemberSince(dateStr: string | null | undefined): string {
    if (!dateStr) return 'July 2026'; // fallback
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function AccountPage() {
  const supabase = await createSSRClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch complete profile metadata
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: any | null };

  // Fetch recent orders with items and images
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        id,
        quantity,
        price,
        product:products(
          name, 
          slug,
          product_images(image_url)
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }) as { data: any[] | null };

  // Fetch saved addresses
  const { data: addresses } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false }) as { data: any[] | null };

  // Fetch wishlist items
  const { data: wishlist } = await supabase
    .from('wishlists')
    .select(`
      id,
      product:products(
        id,
        name,
        slug,
        base_price,
        product_images(image_url)
      )
    `)
    .eq('user_id', user.id) as { data: any[] | null };

  const defaultAddress = addresses?.find(a => a.is_default) || addresses?.[0];
  
  const displayFullName = profile?.full_name?.trim() || '';
  const displayFirstName = displayFullName ? displayFullName.split(' ')[0] : 'Sir/Madam';

  // Completion calculation (Avatar is optional and excluded)
  const hasName = !!displayFullName;
  const hasPhone = !!profile?.phone?.trim();
  const hasAddress = !!addresses && addresses.length > 0;
  
  const progress = 25 
    + (hasName ? 25 : 0) 
    + (hasPhone ? 25 : 0) 
    + (hasAddress ? 25 : 0);

  const isProfileComplete = progress === 100;

  // Address type icons mapping
  const getAddressIcon = (type: string = 'Home') => {
    switch (type?.toLowerCase()) {
      case 'work': return '💼';
      case 'other': return '📍';
      default: return '🏠';
    }
  };

  return (
    <div className="space-y-8 pb-16 font-sans">
      
      {/* ── Dashboard Header ── */}
      <section className="relative overflow-hidden rounded-[2rem] bg-deep-forest p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-raw-clay/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -ml-24 -mb-24" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3.5">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="border-white/20 text-white/80 font-medium px-3 py-1 bg-white/5 backdrop-blur-sm uppercase tracking-widest text-[9px]">
                {orders && orders.length > 5 ? 'Platinum Companion' : orders && orders.length > 2 ? 'Gold Inner Circle' : 'Silver Aficionado'}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 font-semibold px-3 py-1 bg-emerald-500/10 backdrop-blur-sm flex items-center gap-1 text-[9px] uppercase tracking-wider">
                Verified Email ✓
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Welcome back, <br />
              <span className="text-raw-clay italic">{displayFirstName}</span>
            </h1>
            <p className="text-stone-300 max-w-md text-sm font-light leading-relaxed">
              Curate your sanctuary, track your craft deliveries, and manage your preferences.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end justify-center gap-1.5 text-stone-300">
            <span className="text-xs uppercase tracking-widest font-bold text-stone-400">Account Created</span>
            <span className="font-serif font-extrabold text-white text-lg tracking-tight">
              Member Since {formatMemberSince(profile?.created_at || user.created_at)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Quick Actions Row ── */}
      <section className="bg-white border border-stone-200/50 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-start gap-4">
          <span className="text-xs uppercase font-bold tracking-widest text-stone-400 mr-2">Quick Actions</span>
          <Link href="/account/addresses/new">
            <Button size="sm" className="bg-stone-50 hover:bg-stone-100 text-stone-900 border border-stone-200 rounded-full font-bold text-xs uppercase tracking-wider px-5 h-9">
              <Plus className="mr-1.5 h-3.5 w-3.5 text-raw-clay" /> Add Address
            </Button>
          </Link>
          <Link href="/account/orders">
            <Button size="sm" className="bg-stone-50 hover:bg-stone-100 text-stone-900 border border-stone-200 rounded-full font-bold text-xs uppercase tracking-wider px-5 h-9">
              <Package className="mr-1.5 h-3.5 w-3.5 text-raw-clay" /> View Orders
            </Button>
          </Link>
          <Link href="/account/orders">
            <Button size="sm" className="bg-stone-50 hover:bg-stone-100 text-stone-900 border border-stone-200 rounded-full font-bold text-xs uppercase tracking-wider px-5 h-9">
              <Eye className="mr-1.5 h-3.5 w-3.5 text-raw-clay" /> Track Order
            </Button>
          </Link>
          <Link href="/account/profile">
            <Button size="sm" className="bg-stone-50 hover:bg-stone-100 text-stone-900 border border-stone-200 rounded-full font-bold text-xs uppercase tracking-wider px-5 h-9">
              <User className="mr-1.5 h-3.5 w-3.5 text-raw-clay" /> Edit Profile
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Suggestion Profile Completion Card ── */}
      <section className="bg-white border border-stone-200/50 rounded-3xl p-6 shadow-sm">
        {isProfileComplete ? (
          <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 fill-emerald-100 text-emerald-600 animate-pulse" />
            <span>✓ Your profile is complete. Enjoy fast 1-click checkouts!</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-deep-forest">Complete your profile</h3>
                <p className="text-stone-500 text-xs mt-0.5">Finish setting up your details for a frictionless checkout experience.</p>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={progress} className="h-2 w-28 bg-stone-100 [&>div]:bg-raw-clay" />
                <span className="font-serif font-extrabold text-raw-clay text-sm shrink-0">{progress}% Set Up</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-stone-600">
              <span className="flex items-center gap-1 text-emerald-600 line-through"><CheckCircle2 className="h-4 w-4" /> Email Verified</span>
              <span className={cn("flex items-center gap-1", hasName ? "text-emerald-600 line-through" : "text-stone-400")}>
                {hasName ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} Full Name
              </span>
              <span className={cn("flex items-center gap-1", hasPhone ? "text-emerald-600 line-through" : "text-stone-400")}>
                {hasPhone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} Phone Number
              </span>
              <span className={cn("flex items-center gap-1", hasAddress ? "text-emerald-600 line-through" : "text-stone-400")}>
                {hasAddress ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} Default Address
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Dashboard Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN (FRONT AND CENTER): ORDERS CARD */}
        <div className="lg:col-span-8 space-y-8">
          
          <Card className="border border-stone-200/50 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-stone-100 bg-stone-50/50 flex flex-row items-center justify-between py-5">
              <div>
                <CardTitle className="text-xl font-serif text-deep-forest font-bold">Recent Orders</CardTitle>
                <CardDescription className="text-xs">Monitor delivery status and view invoice archives.</CardDescription>
              </div>
              <Link href="/account/orders">
                <Button variant="link" className="text-deep-forest text-xs font-bold uppercase tracking-wider p-0 h-auto">View All Orders →</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              {orders && orders.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {orders.slice(0, 3).map((order) => {
                    const statusMap: Record<string, { color: string; label: string; percent: number }> = {
                      'pending': { color: 'bg-amber-500 text-white', label: 'Processing', percent: 20 },
                      'processing': { color: 'bg-amber-500 text-white', label: 'Processing', percent: 45 },
                      'shipped': { color: 'bg-blue-500 text-white', label: 'Shipped', percent: 80 },
                      'delivered': { color: 'bg-emerald-600 text-white', label: 'Delivered', percent: 100 },
                      'cancelled': { color: 'bg-red-500 text-white', label: 'Cancelled', percent: 0 },
                    };
                    const status = statusMap[order.status] || { color: 'bg-stone-500 text-white', label: order.status, percent: 5 };
                    const firstItem = order.order_items?.[0];

                    return (
                      <div key={order.id} className="py-6 first:pt-0 last:pb-0 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <p className="font-bold text-stone-900">Order ID: #{order.order_number || order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-stone-400 font-medium">{formatDate(order.created_at)}</p>
                          </div>
                          <Badge className={cn("font-bold text-[10px] tracking-wide uppercase px-2.5 h-6", status.color)}>
                            {status.label}
                          </Badge>
                        </div>

                        {firstItem && (
                          <div className="flex gap-4 p-3 bg-stone-50/50 rounded-xl border border-stone-100">
                            <div className="relative h-16 w-12 bg-white rounded border border-stone-100 p-1 shrink-0">
                              {firstItem.product?.product_images?.[0] ? (
                                <Image src={firstItem.product.product_images[0].image_url} alt="" fill className="object-contain" />
                              ) : (
                                <ShoppingBag className="mx-auto my-auto text-stone-300 h-6 w-6 mt-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-stone-900 text-sm truncate">{firstItem.product?.name}</p>
                              <p className="text-xs text-stone-400 font-medium">Qty: {firstItem.quantity} • {formatPrice(firstItem.price)}</p>
                              {order.order_items.length > 1 && (
                                <p className="text-xs text-raw-clay font-bold mt-1">+ {order.order_items.length - 1} more item{order.order_items.length > 2 ? 's' : ''}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-stone-950 text-base">{formatPrice(order.total)}</p>
                              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Total amount</p>
                            </div>
                          </div>
                        )}

                        {/* Miniature Tracking Bar (if in progress) */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                              <span>Delivery Route</span>
                              <span className="text-deep-forest font-serif">{status.percent}% transit</span>
                            </div>
                            <Progress value={status.percent} className="h-1.5 bg-stone-100 [&>div]:bg-deep-forest" />
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 text-xs pt-1.5">
                          <Link href={`/account/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg font-semibold text-xs border-stone-200">
                              Track Details
                            </Button>
                          </Link>
                          {order.payment_status === 'completed' && (
                            <Link href={`/api/admin/orders/${order.id}/invoice`} target="_blank">
                              <Button variant="ghost" size="sm" className="h-9 px-4 text-stone-600 hover:text-deep-forest font-semibold text-xs">
                                Download Invoice
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="text-center py-12 space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-stone-50 border border-dashed border-stone-200 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-stone-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-stone-800">You haven&apos;t placed any orders yet</h4>
                    <p className="text-xs text-stone-400 mt-1">Place your first order to begin compiling your sanctuary collections.</p>
                  </div>
                  <Link href="/shop" className="inline-block">
                    <Button className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full text-xs font-bold uppercase tracking-wider h-10 px-6 mt-2">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WISHLIST CARD */}
          <Card className="border border-stone-200/50 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-serif text-deep-forest font-bold">Wishlist</CardTitle>
                <CardDescription className="text-xs">Your curated bookmarks and favorite drops.</CardDescription>
              </div>
              <Link href="/account/wishlist">
                <Button variant="link" className="text-deep-forest text-xs font-bold uppercase tracking-wider p-0 h-auto">View Wishlist →</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              {wishlist && wishlist.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {wishlist.slice(0, 4).map((item) => (
                    <Link key={item.id} href={`/product/${item.product?.slug}`} className="group">
                      <div className="relative aspect-[3/4] bg-stone-50 border border-stone-100 rounded-lg p-2 flex flex-col justify-between overflow-hidden">
                        {item.product?.product_images?.[0] ? (
                          <Image 
                            src={item.product.product_images[0].image_url} 
                            alt="" 
                            fill 
                            className="object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-stone-100 rounded">
                            <Heart className="h-6 w-6 text-stone-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <p className="text-[10px] text-white font-bold truncate w-full">{item.product?.name}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 space-y-3.5">
                  <div className="mx-auto w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-50" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-stone-700">Wishlist is empty</h4>
                    <p className="text-[11px] text-stone-400 mt-1">Bookmark items that catch your eye for checkout later.</p>
                  </div>
                  <Link href="/shop" className="inline-block">
                    <Button variant="link" className="text-deep-forest text-xs font-bold uppercase tracking-wider p-0 h-auto flex items-center gap-1">
                      Explore Products <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN: INFO, ADDRESSES, SECURITY CARDS */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* PERSONAL INFO CARD */}
          <Card className="border border-stone-200/50 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-serif text-deep-forest font-bold">Personal Info</CardTitle>
              </div>
              <Link href="/account/profile">
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-stone-600 hover:text-deep-forest uppercase tracking-wider">Edit</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Full Name</span>
                <p className="text-sm font-bold text-stone-900 mt-0.5">{profile?.full_name || 'Not Setup'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1.5">
                  Email Address 
                  <span className="text-[8px] bg-green-50 text-green-600 border border-green-200 px-1 rounded">Verified</span>
                </span>
                <p className="text-sm font-bold text-stone-900 mt-0.5 break-all">{user.email}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Phone Number</span>
                <p className="text-sm font-bold text-stone-900 mt-0.5">{formatPhoneDisplay(profile?.phone)}</p>
              </div>
              {profile?.dob && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Date of Birth</span>
                  <p className="text-sm font-bold text-stone-900 mt-0.5">{new Date(profile.dob).toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
                </div>
              )}
              {profile?.gender && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Gender</span>
                  <p className="text-sm font-bold text-stone-900 mt-0.5 capitalize">{profile.gender}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ADDRESS BOOK CARD */}
          <Card className="border border-stone-200/50 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-serif text-deep-forest font-bold">Address Book</CardTitle>
              </div>
              <Link href="/account/addresses">
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-stone-600 hover:text-deep-forest uppercase tracking-wider">Manage</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {defaultAddress ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{getAddressIcon(defaultAddress.type)}</span>
                      <p className="text-xs font-bold text-raw-clay uppercase tracking-widest">{defaultAddress.type || 'Home'} (Default)</p>
                    </div>
                    <p className="text-sm font-bold text-stone-900 mt-1">{defaultAddress.full_name}</p>
                    <p className="text-xs text-stone-600 leading-relaxed font-medium mt-0.5">
                      {defaultAddress.address_line1}, {defaultAddress.city}, {defaultAddress.state} - <span className="font-bold">{defaultAddress.postal_code}</span>
                    </p>
                    <p className="text-xs text-stone-600 font-medium">Contact: {defaultAddress.phone}</p>
                  </div>
                  {addresses && addresses.length > 1 && (
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider border-t pt-3">
                      + {addresses.length - 1} other address{addresses.length > 2 ? 'es' : ''} saved
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 space-y-3.5">
                  <div className="mx-auto w-10 h-10 rounded-full bg-stone-50 border border-dashed border-stone-200 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-stone-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-stone-700">No saved addresses</h4>
                    <p className="text-[10px] text-stone-400 mt-1">Establish shipping sanctuaries for speedier checkouts.</p>
                  </div>
                  <Link href="/account/addresses/new" className="inline-block">
                    <Button variant="outline" size="sm" className="h-9 rounded-lg text-xs font-bold border-stone-200 uppercase tracking-wider px-4">
                      Add Address
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LOGIN & SECURITY CARD */}
          <Card className="border border-stone-200/50 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-serif text-deep-forest font-bold">Security</CardTitle>
              <Link href="/account/security">
                <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-stone-600 hover:text-deep-forest uppercase tracking-wider">View</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-50 rounded-full border border-emerald-100/50 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-stone-900">OTP-Only Security Active</p>
                <p className="text-[10px] text-stone-400 font-medium">Logged in passwordlessly via email keys.</p>
              </div>
            </CardContent>
          </Card>

          {/* NOTIFICATIONS CARD */}
          <Card className="border border-stone-200/50 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b border-stone-100 bg-stone-50/50 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-serif text-deep-forest font-bold">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-50 rounded-full border border-blue-100/50 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-stone-900">Transactional Updates Enabled</p>
                <p className="text-[10px] text-stone-400 font-medium">WhatsApp updates sent for all order drops.</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
