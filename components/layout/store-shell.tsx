'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileNav } from '@/components/layout/mobile-nav';

export function StoreShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');

    if (isAdmin) {
        return <>{children}</>;
    }

    return (
        <div className="relative flex min-h-screen flex-col">
            <div className="bg-black text-white py-2 px-4 text-center text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase overflow-hidden whitespace-nowrap text-ellipsis">
                ⚡ Free Shipping over ₹999 | Root &amp; Loom ⚡
            </div>
            <Suspense
                fallback={
                    <header className="sticky top-0 z-50 w-full h-16 md:h-20 bg-transparent border-b border-transparent">
                        <div className="container mx-auto px-1 sm:px-4 h-full flex items-center justify-between" />
                    </header>
                }
            >
                <Header />
            </Suspense>
            <main className="flex-1 pb-bottom-nav md:pb-0">
                {children}
            </main>
            <Footer />
            <MobileNav />
        </div>
    );
}

