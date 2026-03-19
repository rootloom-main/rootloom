'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, User, Menu, X, Search, ChevronRight, Heart } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SmartSearch } from '@/components/search/smart-search';
const SearchOverlay = dynamic(() => import('@/components/search/search-overlay').then(mod => ({ default: mod.SearchOverlay })), { 
  ssr: false,
  loading: () => <div className="h-10 w-10 animate-pulse bg-stone-100 rounded-full" />
});
import { Badge } from '@/components/ui/badge';
import { Suspense } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { createClient } from '@/lib/supabase/client';
const CartSheet = dynamic(() => import('@/components/layout/cart-sheet').then(mod => ({ default: mod.CartSheet })), {
  ssr: false
});
import { useAuth } from '@/components/auth/supabase-auth-provider';

export function Header() {
  const { user, profile, isAdmin, refreshSession } = useAuth();
  // ... state ...
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = React.useRef(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const { cartCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    // ... scroll logic ...
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // 1. Sync auth context
    await refreshSession();

    // 2. Refresh server state
    router.refresh();

    // 3. HARD REDIRECT - Ensures session cookies are fully cleared and 
    // all server/client components are fresh.
    window.location.href = '/';
  };

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    { name: 'Collections', href: '/collections' },
    { name: 'Men', href: '/shop?category=men' },
    { name: 'Women', href: '/shop?category=women' },
    { name: 'Kids', href: '/shop?category=kids' },
    { name: 'About', href: '/about' },
  ];

  const isLinkActive = (href: string, pathname: string | null, currentCategory: string | null): boolean => {
    const [path, query] = href.split('?');
    if (path === '/' && pathname !== '/') return false;

    // Check if link has a category param
    if (query) {
      const params = new URLSearchParams(query);
      const targetCategory = params.get('category');
      return pathname === path && currentCategory === targetCategory;
    }

    // Special case for 'Shop' (no category): 
    // Only active if we are on /shop AND no category is selected.
    if (path === '/shop' && pathname === '/shop' && currentCategory) return false;

    return pathname?.startsWith(path) || false;
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500 ease-in-out font-sans",
          isVisible ? "translate-y-0" : "-translate-y-full",
          isScrolled
            ? "bg-white/70 backdrop-blur-xl shadow-sm border-b border-white/20"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="container mx-auto px-1 sm:px-4">
          <div className="flex h-16 md:h-20 items-center justify-between sm:gap-4">

            {/* Left: Mobile Menu & Logo */}
            <div className="flex items-center gap-0.5 sm:gap-4 min-w-0">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 md:hidden text-deep-forest hover:bg-stone-paper rounded-full" aria-label="Open mobile menu">
                    <Menu className="h-4 w-4 sm:h-6 sm:w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] bg-heirloom-white border-r border-woven-sand">
                  <SheetHeader className="border-b border-woven-sand/50 pb-4 mb-4">
                    <SheetTitle className="font-serif text-2xl font-bold text-deep-forest text-left">
                      ROOT&LOOM
                    </SheetTitle>
                  </SheetHeader>

                  <Suspense fallback={<div className="flex flex-col gap-2 h-40 animate-pulse bg-stone-50 rounded-lg" />}>
                    <MobileNav navigation={navigation} pathname={pathname} isLinkActive={isLinkActive} />
                  </Suspense>

                  <div className="mt-8 pt-6 border-t border-woven-sand/50 space-y-4">
                    {mounted && (
                      !user ? (
                        <div className="flex flex-col gap-3">
                          <Link href={`/auth/login?next=${encodeURIComponent(pathname || '/')}`}>
                            <Button variant="outline" className="w-full border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-heirloom-white">
                              Login
                            </Button>
                          </Link>
                          <Link href="/auth/signup">
                            <Button className="w-full bg-deep-forest text-heirloom-white hover:bg-deep-forest/90">
                              Create Account
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 px-2">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-deep-forest to-raw-clay flex items-center justify-center text-white font-serif font-bold text-lg shrink-0">
                              {(profile?.full_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-sm font-semibold text-deep-forest truncate">
                                {profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || (user.phone ? `+91 ${user.phone.replace(/\D/g,'').slice(-10, -5)} ${user.phone.replace(/\D/g,'').slice(-5)}` : 'Guest')}
                              </p>
                              <p className="text-xs text-slate-bark truncate max-w-[160px]">
                                {user.email || (user.phone ? `+${user.phone.replace(/\D/g,'')}` : '')}
                              </p>
                            </div>
                          </div>
                          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 px-2">
                            Sign Out
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center gap-1 group relative z-50 min-w-0">
                <span className="font-serif text-xl sm:text-2xl md:text-4xl font-black tracking-tighter text-deep-forest transition-colors duration-300 group-hover:text-raw-clay whitespace-nowrap">
                  ROOT&LOOM
                </span>
              </Link>
            </div>

            {/* Center: Desktop Navigation */}
            <Suspense fallback={<div className="hidden md:flex items-center gap-8 w-64 h-6 animate-pulse bg-stone-50 rounded" />}>
              <DesktopNav navigation={navigation} pathname={pathname} isLinkActive={isLinkActive} />
            </Suspense>

            {/* Right: Icons */}
            <div className="flex items-center gap-0 flex-shrink-0">
              <div className="hidden lg:block w-72 mr-2">
                <SmartSearch />
              </div>

              <div className="lg:hidden">
                <SearchOverlay />
              </div>

              <Link href="/account/wishlist" className="relative group" aria-label="View wishlist">
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-deep-forest hover:text-raw-clay hover:bg-transparent rounded-full transition-colors" aria-label="Wishlist">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                  {mounted && wishlistCount > 0 && (
                    <Badge
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center bg-red-500 text-white border-2 border-white animate-in zoom-in"
                    >
                      {wishlistCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 sm:h-10 sm:w-10 text-deep-forest hover:text-raw-clay hover:bg-transparent rounded-full transition-colors"
                onClick={() => setIsCartOpen(true)}
                aria-label="Toggle cart"
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                {mounted && cartCount > 0 && (
                  <Badge
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center bg-raw-clay text-white border-2 border-white animate-in zoom-in"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>

              {mounted && (
                user ? (() => {
                  // Format helper
                  const formatPhone = (p: string) => {
                    const digits = p.replace(/\D/g, '');
                    if (digits.length === 12 && digits.startsWith('91')) {
                      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
                    }
                    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
                    return `+${digits}`;
                  };

                  // Resolve display name: profile DB > metadata > email prefix > phone
                  const displayName =
                    profile?.full_name ||
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    (user.email ? user.email.split('@')[0] : null) ||
                    (user.phone ? formatPhone(user.phone) : 'Guest');

                  // Avatar initial from display name
                  const avatarInitial = displayName[0]?.toUpperCase() || '?';

                  // Format sub-label: prefer email, else format phone nicely
                  const rawPhone = profile?.phone || user.phone || user.user_metadata?.phone;
                  const subLabel = user.email || (rawPhone ? formatPhone(rawPhone) : '');

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-deep-forest hover:text-raw-clay hover:bg-transparent transition-colors" aria-label="User account menu">
                          <span className="h-8 w-8 rounded-full bg-deep-forest flex items-center justify-center text-white font-serif font-bold text-sm">
                            {avatarInitial}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60 p-2 bg-white border border-stone-200 shadow-lg rounded-xl">
                        <div className="flex items-center justify-start gap-3 p-2 mb-2 rounded-lg bg-stone-50 border border-stone-100">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-deep-forest to-raw-clay flex items-center justify-center text-white font-serif font-bold text-base shrink-0">
                            {avatarInitial}
                          </div>
                          <div className="flex flex-col space-y-0.5 min-w-0">
                            <p className="text-sm font-semibold truncate text-stone-900">{displayName}</p>
                            {subLabel && <p className="text-xs text-stone-500 truncate">{subLabel}</p>}
                          </div>
                        </div>
                        {/* Admin Link */}
                        {isAdmin && (
                          <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-stone-paper focus:text-deep-forest mb-1 bg-amber-50">
                            <Link href="/admin" className="w-full font-semibold text-amber-700">Admin Dashboard</Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-stone-paper focus:text-deep-forest">
                          <Link href="/account" className="w-full">My Account</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-stone-paper focus:text-deep-forest">
                          <Link href="/collections" className="w-full">Explore Collections</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-stone-paper focus:text-deep-forest">
                          <Link href="/account/wishlist" className="w-full">My Wishlist</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-stone-paper focus:text-deep-forest">
                          <Link href="/account/orders" className="w-full">My Orders</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2 bg-woven-sand" />
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5 rounded-md"
                        >
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })() : (
                  <div className="flex items-center">
                    <Link href={`/auth/login?next=${encodeURIComponent(pathname || '/')}`} className="md:hidden" aria-label="Login">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-deep-forest hover:text-raw-clay hover:bg-transparent" aria-label="Login">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </Link>
                    <Link href={`/auth/login?next=${encodeURIComponent(pathname || '/')}`} className="hidden md:block ml-2">
                      <Button size="sm" className="rounded-full bg-deep-forest text-heirloom-white hover:bg-deep-forest/90 shadow-sm px-6">
                        Login
                      </Button>
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </header>
      <CartSheet />
    </>
  );
}

function MobileNav({ 
  navigation, 
  pathname, 
  isLinkActive 
}: { 
  navigation: any[], 
  pathname: string | null,
  isLinkActive: (href: string, pathname: string | null, currentCategory: string | null) => boolean
}) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams?.get('category') || null;

  return (
    <nav className="flex flex-col gap-2">
      {navigation.map((item) => {
        const active = isLinkActive(item.href, pathname, currentCategory);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors group",
              active
                ? "bg-stone-paper text-deep-forest"
                : "text-slate-bark hover:bg-stone-paper/50 hover:text-deep-forest"
            )}
          >
            {item.name}
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform opacity-0 group-hover:opacity-100",
              active && "opacity-100"
            )} />
          </Link>
        )
      })}
    </nav>
  );
}

function DesktopNav({ 
  navigation, 
  pathname, 
  isLinkActive 
}: { 
  navigation: any[], 
  pathname: string | null,
  isLinkActive: (href: string, pathname: string | null, currentCategory: string | null) => boolean
}) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams?.get('category') || null;

  return (
    <nav className="hidden md:flex items-center gap-8">
      {navigation.map((item) => {
        const active = isLinkActive(item.href, pathname, currentCategory);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "text-sm font-medium relative py-1 transition-colors duration-300 group",
              active
                ? "text-deep-forest font-semibold"
                : "text-slate-bark hover:text-deep-forest"
            )}
          >
            {item.name}
            <span className={cn(
              "absolute bottom-0 left-0 h-0.5 bg-raw-clay rounded-full transition-all duration-300 ease-out",
              active ? "w-full" : "w-0 group-hover:w-full"
            )} />
          </Link>
        );
      })}
    </nav>
  );
}
