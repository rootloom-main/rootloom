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
        { name: 'Home', href: '/', icon: Home },
        { name: 'Shop', href: '/shop', icon: Search },
        { name: 'Wishlist', href: '/account/wishlist', icon: Heart, badge: wishlistCount },
        { name: 'Cart', href: '/cart', icon: ShoppingBag, badge: cartCount },
        { name: 'Account', href: '/account', icon: User },
    ];

    if (
        pathname?.startsWith('/checkout') ||
        pathname?.startsWith('/admin') ||
        pathname?.startsWith('/auth')
    ) {
        return null;
    }

    return (
        <div
            className="fixed bottom-0 left-0 z-50 w-full bg-white/95 backdrop-blur-xl border-t border-stone-200 md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <nav className="grid h-16 grid-cols-5 mx-auto max-w-lg">
                {navItems.map((item) => {
                    const isActive =
                        item.href === '/'
                            ? pathname === '/'
                            : pathname?.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'inline-flex flex-col items-center justify-center transition-colors active:scale-95 touch-manipulation',
                                isActive ? 'text-deep-forest' : 'text-stone-400'
                            )}
                            style={{ minHeight: 44 }}
                            aria-label={item.name}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <div className="relative flex items-center justify-center w-11 h-11">
                                <Icon
                                    className={cn(
                                        'w-[22px] h-[22px] transition-all duration-200',
                                        isActive && 'fill-current scale-110'
                                    )}
                                />
                                {item.badge != null && item.badge > 0 && (
                                    <span className="absolute top-1 right-0.5 inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-raw-clay rounded-full border-2 border-white">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span
                                className={cn(
                                    'text-[10px] font-semibold -mt-1.5 transition-colors',
                                    isActive ? 'text-deep-forest' : 'text-stone-400'
                                )}
                            >
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
