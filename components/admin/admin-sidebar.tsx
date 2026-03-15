'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    Star,
    Archive,
    BarChart,
    Settings,
    LogOut,
    Search,
    Megaphone,
    Tag,
    FileText,
    ChevronDown,
    RefreshCcw,
    Layers,
    Menu // Assuming hamburger for mobile later, but keeping simple for now
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const sidebarGroups = [
    {
        label: "Management",
        items: [
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Messages', href: '/admin/messages', icon: FileText },
            { name: 'Products', href: '/admin/products', icon: ShoppingBag },
            { name: 'Orders', href: '/admin/orders', icon: Package },
            { name: 'Returns', href: '/admin/returns', icon: RefreshCcw },
            { name: 'Inventory', href: '/admin/inventory', icon: Archive },
            { name: 'Customers', href: '/admin/customers', icon: Users },
        ]
    },
    {
        label: "Marketing & Content",
        items: [
            { name: 'Campaigns', href: '/admin/marketing/campaigns', icon: Megaphone },
            { name: 'Collections', href: '/admin/marketing/collections', icon: Layers },
            { name: 'Banners', href: '/admin/marketing/banners', icon: Archive },
            { name: 'Coupons', href: '/admin/marketing/coupons', icon: Tag },
            { name: 'Pages', href: '/admin/pages', icon: FileText },
            { name: 'Reviews', href: '/admin/reviews', icon: Star },
        ]
    },
    {
        label: "Analysis",
        items: [
            { name: 'Analytics', href: '/admin/analytics', icon: BarChart },
        ]
    }
];

export function AdminSidebar({ user, role }: { user: any; role?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <aside className="hidden md:flex flex-col w-72 min-h-screen bg-[#0a0f1a] text-stone-400 border-r border-stone-800/50">
            {/* Header / Brand */}
            <div className="h-24 flex flex-col justify-center px-8 border-b border-stone-800/30 bg-[#0d121f]">
                <Link href="/" className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-serif font-bold tracking-tight text-white italic">Root & Loom</span>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-raw-clay uppercase">Executive Portal</span>
                    <Badge variant="outline" className={cn("text-[9px] h-4 px-1 border-white/10 font-mono", isDev ? "text-amber-500" : "text-deep-forest")}>
                        {isDev ? 'DEV' : 'PROD'}
                    </Badge>
                </div>
            </div>


            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">
                {sidebarGroups.map((group, idx) => (
                    <div key={idx}>
                        <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            {group.label}
                        </h3>
                        <nav className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative",
                                            isActive
                                                ? "bg-gradient-to-r from-stone-800 to-transparent text-white shadow-inner"
                                                : "text-stone-500 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className={cn("h-4.5 w-4.5 transition-all duration-300", isActive ? "text-raw-clay scale-110" : "text-stone-600 group-hover:text-stone-300")} />
                                        {item.name}
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-raw-clay rounded-r-full shadow-[0_0_10px_rgba(188,141,104,0.5)]" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                ))}

                {role === 'superadmin' && (
                    <div>
                        <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            System
                        </h3>
                        <nav className="space-y-0.5">
                            <Link
                                href="/admin/admins"
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group",
                                    pathname?.startsWith('/admin/admins')
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                )}
                            >
                                <Settings className="h-4 w-4 text-slate-500 group-hover:text-slate-300" />
                                Admins
                            </Link>
                        </nav>
                    </div>
                )}
            </div>

            {/* Footer / User Profile */}
            <div className="p-6 border-t border-stone-800/50 bg-[#0d121f]">
                <div className="flex items-center gap-4 mb-6 px-1">
                    <Avatar className="h-10 w-10 border border-stone-800 shadow-xl ring-1 ring-raw-clay/20">
                        <AvatarFallback className="bg-stone-900 text-raw-clay text-sm font-bold">
                            SP
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold truncate text-white tracking-tight">Samir Pandey</span>
                        <span className="text-[10px] font-bold text-raw-clay uppercase tracking-widest">{role || 'Managing Director'}</span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full justify-start h-10 text-stone-500 hover:text-rose-400 hover:bg-rose-500/5 px-3 text-xs font-bold uppercase tracking-widest"
                    onClick={handleSignOut}
                >
                    <LogOut className="mr-3 h-4 w-4" />
                    Terminate Session
                </Button>
            </div>
        </aside>
    );
}
