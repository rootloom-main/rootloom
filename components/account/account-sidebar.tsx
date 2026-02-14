'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingBag,
    Heart,
    MapPin,
    User,
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const sidebarItems = [
    {
        title: 'Overview',
        href: '/account',
        icon: LayoutDashboard
    },
    {
        title: 'My Orders',
        href: '/account/orders',
        icon: ShoppingBag
    },
    {
        title: 'Wishlist',
        href: '/account/wishlist',
        icon: Heart
    },
    {
        title: 'Addresses',
        href: '/account/addresses',
        icon: MapPin
    },
    {
        title: 'Profile Settings',
        href: '/account/profile', // We might need to create this or map it to /account/settings
        icon: User
    }
];

export function AccountSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/');
    };

    return (
        <aside className="w-full md:w-64 lg:w-72 flex-shrink-0 mb-8 md:mb-0">
            <div className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden sticky top-24">
                <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                    <h2 className="font-serif text-lg font-medium text-deep-forest">Account Menu</h2>
                </div>

                <nav className="p-2 space-y-1">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                            >
                                <span className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-stone-100 text-deep-forest font-semibold shadow-sm"
                                        : "text-slate-600 hover:bg-stone-50 hover:text-deep-forest"
                                )}>
                                    <Icon size={18} className={cn(isActive ? "text-deep-forest" : "text-slate-400")} />
                                    {item.title}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-2 border-t border-stone-100">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 px-4"
                        onClick={handleSignOut}
                    >
                        <LogOut size={18} className="mr-3" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </aside>
    );
}
