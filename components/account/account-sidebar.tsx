'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingBag,
    Heart,
    MapPin,
    User,
    LogOut,
    CreditCard,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

const sidebarItems = [
    { title: 'Overview', href: '/account', icon: LayoutDashboard },
    { title: 'Orders', href: '/account/orders', icon: ShoppingBag },
    { title: 'Addresses', href: '/account/addresses', icon: MapPin },
    { title: 'Wishlist', href: '/account/wishlist', icon: Heart },
    { title: 'Payments', href: '/account/payments', icon: CreditCard },
    { title: 'Profile', href: '/account/profile', icon: User },
    { title: 'Security', href: '/account/security', icon: ShieldCheck },
];

export function AccountSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { user, profile } = useAuth();
    const [orderCount, setOrderCount] = useState(0);
    const [savedIdentity, setSavedIdentity] = useState<{ fullName?: string | null; phone?: string | null }>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fetchData = async () => {
            if (!user) return;
            const [{ count }, { data: addr }] = await Promise.all([
                supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('addresses').select('full_name, phone').eq('user_id', user.id).order('is_default', { ascending: false }).limit(1).maybeSingle()
            ]);
            setOrderCount(count || 0);
            setSavedIdentity({ fullName: addr?.full_name || null, phone: addr?.phone || null });
        };
        fetchData();
    }, [user, supabase]);

    const formatPhone = (p: string) => {
        const d = p.replace(/\D/g, '');
        if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
        if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
        return `+${d}`;
    };

    const rawPhone: string = profile?.phone || savedIdentity.phone || user?.phone || user?.user_metadata?.phone || '';
    const userName =
        profile?.full_name ||
        savedIdentity.fullName ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        (user?.email ? user.email.split('@')[0] : null) ||
        (rawPhone ? formatPhone(rawPhone) : 'Guest');

    const memberGrade = orderCount > 5 ? 'Platinum' : orderCount > 2 ? 'Gold' : 'Silver';
    const gradeColor = orderCount > 5 ? 'text-purple-600 border-purple-200 bg-purple-50' : orderCount > 2 ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-stone-600 border-stone-200 bg-stone-50';

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/');
    };

    return (
        <aside className="w-full md:w-72 lg:w-80 flex-shrink-0">
            {/* ── Mobile: horizontal scrollable tab bar ─────────── */}
            <div className="md:hidden mb-4 -mx-4">
                <div className="flex overflow-x-auto scrollbar-hide px-4 pb-1 gap-2">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/account' && pathname?.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all border',
                                    isActive
                                        ? 'bg-deep-forest text-white border-deep-forest'
                                        : 'bg-white text-stone-500 border-stone-200'
                                )}
                                style={{ minHeight: 64, minWidth: 60 }}
                            >
                                <Icon size={18} />
                                {item.title}
                            </Link>
                        );
                    })}
                    <button
                        onClick={handleSignOut}
                        className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl text-[11px] font-semibold bg-white text-red-500 border border-red-100 transition-all"
                        style={{ minHeight: 64, minWidth: 60 }}
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* ── Desktop: vertical sidebar card ────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl border border-stone-100 shadow-xl overflow-hidden sticky top-24">
                {/* User Profile */}
                <div className="p-8 border-b border-stone-100 bg-gradient-to-b from-stone-50/50 to-transparent min-h-[160px]">
                    {mounted ? (
                        <>
                            <div className="flex items-center gap-4 mb-6">
                                <Avatar className="h-12 w-12 border-2 border-stone-200 shadow-md ring-2 ring-stone-100">
                                    <AvatarImage src={profile?.avatar_url || ''} className="object-cover" />
                                    <AvatarFallback className="bg-gradient-to-br from-deep-forest to-raw-clay text-white text-sm font-bold">
                                        {userName ? userName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() : '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-bold text-stone-500 uppercase tracking-[0.2em] mb-1">Welcome</span>
                                    <span className="text-lg font-serif font-bold truncate text-deep-forest tracking-tight">{userName}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn('text-[9px] h-5 px-2 font-bold uppercase tracking-widest rounded-full', gradeColor)}>
                                    {memberGrade} Companion
                                </Badge>
                                <Badge variant="outline" className="text-[9px] h-5 px-2 border-stone-200 text-stone-500 bg-stone-50 font-medium rounded-full">
                                    Est. {new Date(user?.created_at || '').getFullYear() || '2024'}
                                </Badge>
                            </div>
                        </>
                    ) : (
                        <div className="animate-pulse space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-stone-100" />
                                <div className="space-y-2">
                                    <div className="h-2 w-16 bg-stone-100 rounded" />
                                    <div className="h-3 w-24 bg-stone-100 rounded" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white">
                    <h3 className="px-4 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-3">My Account</h3>
                    <nav className="space-y-1.5">
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || (item.href !== '/account' && pathname?.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden',
                                        isActive
                                            ? 'bg-gradient-to-r from-stone-50 to-transparent text-deep-forest shadow-sm ring-1 ring-stone-100'
                                            : 'text-stone-500 hover:text-deep-forest hover:bg-stone-50/50'
                                    )}
                                >
                                    <Icon size={18} className={cn('transition-all duration-500', isActive ? 'text-raw-clay scale-110 rotate-3' : 'text-stone-400 group-hover:text-stone-600 group-hover:scale-110 group-hover:-rotate-3')} />
                                    {item.title}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-raw-clay rounded-r-full shadow-[0_0_15px_rgba(188,141,104,0.3)]" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    <Separator className="my-6 bg-stone-100 mx-4" />
                    <div className="px-2 pb-2">
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-12 text-stone-500 hover:text-rose-500 hover:bg-rose-50 px-4 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300"
                            onClick={handleSignOut}
                        >
                            <LogOut size={18} className="mr-3" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
