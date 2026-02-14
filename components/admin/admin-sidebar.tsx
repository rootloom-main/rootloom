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
    User,
    Search,
    Megaphone,
    Tag,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const sidebarItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: ShoppingBag },
    { name: 'Orders', href: '/admin/orders', icon: Package },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Reviews', href: '/admin/reviews', icon: Star },
    { name: 'Inventory', href: '/admin/inventory', icon: Archive },
    { name: 'Marketing', href: '/admin/marketing/banners', icon: Megaphone },
    { name: 'Coupons', href: '/admin/marketing/coupons', icon: Tag },
    { name: 'Pages', href: '/admin/pages', icon: FileText },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart },
];

export function AdminSidebar({ user, role }: { user: any; role?: string }) {
    const finalSidebarItems = role === 'superadmin'
        ? [...sidebarItems, { name: 'Admins', href: '/admin/admins', icon: Settings }]
        : sidebarItems;

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
        <div className="flex bg-gray-900 text-gray-100 w-64 min-h-screen flex-col border-r border-gray-800">
            {/* Header / Brand */}
            <div className="p-6 border-b border-gray-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight text-white">Root&Loom</h1>
                    <Badge variant="outline" className={cn("text-xs border-gray-600", isDev ? "text-yellow-400 border-yellow-400" : "text-green-400 border-green-400")}>
                        {isDev ? 'DEV' : 'PROD'}
                    </Badge>
                </div>
                <p className="text-xs text-gray-400">Admin Workspace</p>
            </div>

            {/* Global Search */}
            <div className="px-4 py-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search products/orders..."
                        className="pl-9 bg-gray-800 border-gray-700 text-gray-200 placeholder:text-gray-500 focus-visible:ring-gray-600"
                    />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 space-y-1">
                {finalSidebarItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-gray-800 text-white"
                                    : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-purple-400" : "text-gray-500")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <Avatar className="h-9 w-9 border border-gray-700">
                        <AvatarFallback className="bg-purple-900 text-white text-xs">
                            {(user?.email?.[0] || 'A').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate text-white">Admin User</span>
                        <span className="text-xs text-gray-500 truncate">{user?.email}</span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={handleSignOut}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
