import { redirect } from 'next/navigation';
import { createSSRClient, getCurrentUser } from '@/lib/utils/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, User, ArrowRight, CreditCard, Heart, Layers } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

  // Calculate Member Grade
  const orderCount = orders?.length || 0;
  const memberGrade = orderCount > 5 ? 'Platinum Companion' : orderCount > 2 ? 'Gold Inner Circle' : 'Silver Aficionado';
  const gradeColor = orderCount > 5 ? 'text-purple-400' : orderCount > 2 ? 'text-amber-400' : 'text-stone-400';

  return (
    <div className="space-y-12 pb-16">
      {/* Interactive Hero Greeting */}
      <section className="relative overflow-hidden rounded-[2rem] bg-deep-forest p-8 md:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-raw-clay/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -ml-24 -mb-24" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <Badge variant="outline" className="border-white/20 text-white/80 font-medium px-3 py-1 bg-white/5 backdrop-blur-sm">
              Heirloom Privilege • {memberGrade}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
              Honored to see you, <br />
              <span className="text-raw-clay italic">{profile?.full_name?.split(' ')[0] || 'Sir/Madam'}</span>
            </h1>
            <p className="text-stone-300 max-w-md text-lg font-light leading-relaxed">
              Experience the pinnacle of craft. Your collection and preferences, curated in one sanctuary.
            </p>
          </div>

          {/* Quick Stats / Mini Dashboard */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center text-center min-w-[120px]">
              <span className="text-2xl font-bold text-raw-clay">{orderCount}</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Orders Placed</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center text-center min-w-[120px]">
              <span className="text-2xl font-bold text-raw-clay">₹{orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString('en-IN')}</span>
              <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Collection</span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Order Tracking Widget (if exists) */}
      {recentOrder && recentOrder.status !== 'delivered' && recentOrder.status !== 'cancelled' && (
        <section className="space-y-4">
          {(() => {
            const statusMap: Record<string, { percent: number; label: string }> = {
              'pending': { percent: 15, label: 'Order Authenticated' },
              'processing': { percent: 45, label: 'Crafting in Progress' },
              'shipped': { percent: 80, label: 'In Transit to Sanctuary' },
              'default': { percent: 5, label: 'Securing Shipment' }
            };
            const current = statusMap[recentOrder.status] || statusMap.default;
            return (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-8 bg-raw-clay rounded-full" />
                  <h2 className="text-xl font-serif font-bold text-deep-forest italic">Awaiting Arrival</h2>
                </div>
                <Card className="border-stone-100 shadow-xl rounded-2xl overflow-hidden bg-white group hover:shadow-2xl transition-all duration-500">
                  <div className="bg-stone-50/50 px-6 py-4 border-b border-stone-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-raw-clay/10 p-2 rounded-lg">
                        <Package className="w-5 h-5 text-raw-clay" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Order ID</p>
                        <p className="text-sm font-bold text-deep-forest tracking-tight">#{recentOrder.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-50 text-amber-600 border border-amber-100 font-bold uppercase text-[10px] px-3">
                      {recentOrder.status}
                    </Badge>
                  </div>
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex-1 space-y-6">
                        {/* Progress Bar */}
                        <div className="relative pt-1">
                          <div className="flex mb-2 items-center justify-between">
                            <div className="text-xs font-bold text-stone-500 uppercase">{current.label}</div>
                            <div className="text-xs font-bold text-deep-forest">{current.percent}% Journey</div>
                          </div>
                          <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-stone-100 shadow-inner">
                            <div
                              style={{ width: `${current.percent}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-deep-forest to-raw-clay transition-all duration-1000 ease-out"
                            />
                          </div>
                        </div>
                        <p className="text-sm text-stone-600 italic font-medium">
                          Estimated delivery: <span className="text-deep-forest font-bold">Next 3-5 business days</span>
                        </p>
                      </div>
                      <Link href={`/account/orders/${recentOrder.id}`}>
                        <Button className="w-full md:w-auto bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full px-8 h-12 shadow-lg shadow-deep-forest/20 group">
                          Track Detailed Progress <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </section>
      )}

      {/* World-Class Service Grid (Amazon/Flipkart Style) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-8 bg-raw-clay rounded-full" />
          <h2 className="text-xl font-serif font-bold text-deep-forest italic">Heritage Navigation</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "Order History",
              desc: "Track, return, or buy heirlooms again",
              icon: Package,
              href: "/account/orders",
              color: "text-blue-600",
              bg: "bg-blue-50/50"
            },
            {
              title: "Heirloom Collections",
              desc: "Explore curated sale archives and drops",
              icon: Layers,
              href: "/collections",
              color: "text-indigo-600",
              bg: "bg-indigo-50/50"
            },
            {
              title: "Address Book",
              desc: "Edit shipping portals for orders and gifts",
              icon: MapPin,
              href: "/account/addresses",
              color: "text-emerald-600",
              bg: "bg-emerald-50/50"
            },
            {
              title: "Login & Security",
              desc: "Protect your identity and mobile keys",
              icon: User,
              href: "/account/profile",
              color: "text-amber-600",
              bg: "bg-amber-50/50"
            },
            {
              title: "Your Wishlist",
              desc: "Manage favorites and shared selections",
              icon: Heart,
              href: "/account/wishlist",
              color: "text-rose-600",
              bg: "bg-rose-50/50"
            },
            {
              title: "Inner Circle Rewards",
              desc: "Manage your membership and craft credits",
              icon: CreditCard,
              href: "/account",
              color: "text-purple-600",
              bg: "bg-purple-50/50"
            },
            {
              title: "Expert Assistance",
              desc: "Connect with our master artisans",
              icon: ArrowRight,
              href: "/contact",
              color: "text-stone-600",
              bg: "bg-stone-50/50"
            }
          ].map((item, i) => (
            <Link key={i} href={item.href} className="group">
              <Card className="h-full border-stone-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-raw-clay/20 transition-all duration-500 rounded-2xl p-6 group-hover:bg-gradient-to-br from-white to-stone-50/30">
                <div className="flex items-start gap-4">
                  <div className={cn("p-4 rounded-xl transition-all duration-500 group-hover:scale-110 shadow-sm", item.bg)}>
                    <item.icon className={cn("w-6 h-6", item.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-serif font-bold text-deep-forest mb-1 group-hover:text-raw-clay transition-colors">{item.title}</h3>
                    <p className="text-sm text-stone-500 leading-relaxed font-light">{item.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Personalized Primary Address Snapsnot */}
      <section className="space-y-4 pt-8">
        <Card className="border-stone-100 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-r from-stone-50 to-white">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 bg-deep-forest p-8 flex flex-col justify-center text-white">
                <MapPin className="w-8 h-8 text-raw-clay mb-4" />
                <h3 className="text-2xl font-serif font-bold mb-2">Delivery Sanctuary</h3>
                <p className="text-stone-300 text-sm font-light">Your primary destination for Heirloom arrivals.</p>
              </div>
              <div className="flex-1 p-8">
                {defaultAddress ? (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-raw-clay uppercase tracking-widest">Primary Residence</p>
                      <p className="text-xl font-bold text-deep-forest">{defaultAddress.full_name}</p>
                      <div className="text-stone-600 font-medium">
                        <p>{defaultAddress.address_line1}, {defaultAddress.city}</p>
                        <p>{defaultAddress.state} {defaultAddress.postal_code}</p>
                      </div>
                    </div>
                    <Link href="/account/addresses">
                      <Button variant="outline" className="rounded-full border-stone-200 hover:border-deep-forest hover:text-deep-forest px-8 transition-all">
                        Edit Sanctuary Details
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-4">
                    <p className="text-stone-500 italic mb-4">No shipping sanctuary has been established yet.</p>
                    <Link href="/account/addresses/new">
                      <Button className="bg-raw-clay hover:bg-raw-clay/90 text-white rounded-full px-8">Establish Address</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
