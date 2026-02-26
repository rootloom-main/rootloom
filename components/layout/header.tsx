'use client';

import Link from 'next/link';
import { ShoppingCart, User, Menu, X, Search, ChevronRight, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '@/components/providers/cart-provider';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { SmartSearch } from '@/components/search/smart-search';
import { SearchOverlay } from '@/components/search/search-overlay';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { createClient } from '@/lib/supabase/client';
import { CartSheet } from '@/components/layout/cart-sheet';

export function Header({ user, isAdmin }: { user: any; isAdmin?: boolean }) {
  // ... state ...
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const { cartCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCategory = searchParams?.get('category');

  useEffect(() => {
    // ... scroll logic ...
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 10);
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/shop' },
    { name: 'Men', href: '/shop?category=men' },
    { name: 'Women', href: '/shop?category=women' },
    { name: 'Kids', href: '/shop?category=kids' },
    { name: 'About', href: '/about' },
  ];

  const isLinkActive = (href: string) => {
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

    return pathname?.startsWith(path);
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-deep-forest text-heirloom-white py-1.5 px-4 text-center text-xs font-medium tracking-wide">
        Free Shipping on all orders over ₹999 | 30-Day Easy Returns
      </div>

      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500 ease-in-out font-sans",
          isVisible ? "translate-y-0" : "-translate-y-full",
          isScrolled
            ? "bg-white/70 backdrop-blur-xl shadow-sm border-b border-white/20"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 md:h-20 items-center justify-between">

            {/* Left: Mobile Menu & Logo */}
            <div className="flex items-center gap-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden text-deep-forest hover:bg-stone-paper rounded-full">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] bg-heirloom-white border-r border-woven-sand">
                  <SheetHeader className="border-b border-woven-sand/50 pb-4 mb-4">
                    <SheetTitle className="font-serif text-2xl font-bold text-deep-forest text-left">
                      ROOT&LOOM
                    </SheetTitle>
                  </SheetHeader>

                  <nav className="flex flex-col gap-2">
                    {navigation.map((item) => {
                      const active = isLinkActive(item.href);
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

                  <div className="mt-8 pt-6 border-t border-woven-sand/50 space-y-4">
                    {!user ? (
                      <div className="flex flex-col gap-3">
                        <Link href="/auth/login">
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
                          <div className="h-10 w-10 rounded-full bg-stone-paper flex items-center justify-center text-deep-forest font-serif font-bold text-lg">
                            {(user.email?.[0] || user.phone?.[0] || 'U').toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-deep-forest">My Account</p>
                            <p className="text-xs text-slate-bark truncate max-w-[150px]">{user.email || user.phone}</p>
                          </div>
                        </div>
                        <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 px-2">
                          Sign Out
                        </Button>
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center gap-2 group relative z-50">
                <span className="font-serif text-3xl md:text-4xl font-black tracking-tighter text-deep-forest transition-colors duration-300 group-hover:text-raw-clay">
                  ROOT&LOOM
                </span>
              </Link>
            </div>

            {/* Center: Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navigation.map((item) => {
                const active = isLinkActive(item.href);
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

            {/* Right: Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden lg:block w-72 mr-2">
                <SmartSearch />
              </div>

              <div className="lg:hidden">
                <SearchOverlay />
              </div>

              <Link href="/account/wishlist" className="relative group">
                <Button variant="ghost" size="icon" className="text-deep-forest hover:text-raw-clay hover:bg-transparent rounded-full transition-colors">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
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
                className="relative text-deep-forest hover:text-raw-clay hover:bg-transparent rounded-full transition-colors"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center bg-raw-clay text-white border-2 border-white animate-in zoom-in"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full text-deep-forest hover:text-raw-clay hover:bg-transparent transition-colors">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-2 bg-white border border-stone-200 shadow-lg rounded-xl">
                    <div className="flex items-center justify-start gap-2 p-2 mb-2 rounded-lg bg-stone-50">
                      <div className="h-8 w-8 rounded-full bg-deep-forest flex items-center justify-center text-white font-serif font-bold">
                        {(user.user_metadata?.full_name?.[0] || user.user_metadata?.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="flex flex-col space-y-0.5 max-w-[160px]">
                        <p className="text-sm font-semibold truncate text-stone-900">{user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}</p>
                        <p className="text-xs text-stone-500 truncate">{user.email || user.phone}</p>
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
              ) : (
                <Link href="/auth/login" className="hidden sm:block ml-2">
                  <Button size="sm" className="rounded-full bg-deep-forest text-heirloom-white hover:bg-deep-forest/90 shadow-sm px-6">
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <CartSheet />
    </>
  );
}
