'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingBag, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/providers/cart-provider';
import { useWishlist } from '@/components/providers/wishlist-provider';

export function MobileNav() {
    const pathname = usePathname();
    const { cartCount } = useCart();
    const { wishlistCount } = useWishlist();

    const navItems = [
        {
            name: 'Home',
            href: '/',
            icon: Home,
        },
        {
            name: 'Search',
            href: '/shop', // Default to shop for exploration, or search modal could be triggered
            icon: Search,
        },
        {
            name: 'Wishlist',
            href: '/account/wishlist',
            icon: Heart,
            badge: wishlistCount,
        },
        {
            name: 'Cart',
            href: '/cart',
            icon: ShoppingBag,
            badge: cartCount,
        },
        {
            name: 'Account',
            href: '/account',
            icon: User,
        },
    ];

    // Hide on auth pages or admin pages if needed, but usually good to keep for consistency or hide on specific flows.
    // For now, let's keep it everywhere except maybe checkout.
    if (pathname.startsWith('/checkout') || pathname.startsWith('/admin')) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white/80 backdrop-blur-lg border-t border-stone-200 md:hidden pb-safe">
            <nav className="grid h-full grid-cols-5 mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "inline-flex flex-col items-center justify-center px-5 hover:bg-stone-50 group transition-colors",
                                isActive ? "text-deep-forest" : "text-stone-500"
                            )}
                        >
                            <div className="relative">
                                <Icon className={cn("w-6 h-6 mb-1 transition-transform group-active:scale-95", isActive && "fill-current")} />
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-raw-clay rounded-full border border-white">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium truncate max-w-full">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
