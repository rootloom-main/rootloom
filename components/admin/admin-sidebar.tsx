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
            { name: 'Products', href: '/admin/products', icon: ShoppingBag },
            { name: 'Orders', href: '/admin/orders', icon: Package },
            { name: 'Inventory', href: '/admin/inventory', icon: Archive },
            { name: 'Customers', href: '/admin/customers', icon: Users },
        ]
    },
    {
        label: "Marketing & Content",
        items: [
            { name: 'Marketing', href: '/admin/marketing/banners', icon: Megaphone },
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
        <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#0f172a] text-slate-300 border-r border-slate-800">
            {/* Header / Brand */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight text-white">Root&Loom</span>
                </Link>
                <Badge variant="outline" className={cn("ml-2 text-[10px] h-5 px-1.5 border-slate-700", isDev ? "text-amber-400" : "text-emerald-400")}>
                    {isDev ? 'DEV' : 'PROD'}
                </Badge>
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
                                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group relative",
                                            isActive
                                                ? "bg-slate-800 text-white shadow-sm"
                                                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                        )}
                                    >
                                        <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-purple-400" : "text-slate-500 group-hover:text-slate-300")} />
                                        {item.name}
                                        {isActive && (
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-purple-500 rounded-l-full" />
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
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3 mb-4 px-1">
                    <Avatar className="h-8 w-8 border border-slate-700 bg-purple-900/20">
                        <AvatarFallback className="bg-purple-900/50 text-purple-200 text-xs font-medium">
                            {(user?.email?.[0] || 'A').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate text-white">Admin User</span>
                        <span className="text-xs text-slate-500 truncate">{user?.email}</span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full justify-start h-8 text-slate-400 hover:text-red-400 hover:bg-red-950/20 px-2 text-xs"
                    onClick={handleSignOut}
                >
                    <LogOut className="mr-2 h-3 w-3" />
                    Sign Out
                </Button>
            </div>
        </aside>
    );
}
