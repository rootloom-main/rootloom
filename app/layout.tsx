import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SupabaseAuthProvider } from '@/components/auth/supabase-auth-provider';
import { CartProvider } from '@/components/providers/cart-provider';
import { WishlistProvider } from '@/components/providers/wishlist-provider';
import QueryProvider from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { Suspense } from 'react';
import { ScrollLockFixer } from '@/components/utils/scroll-lock-fixer';


const inter = Inter({
	subsets: ['latin'],
	variable: '--font-sans',
	display: 'swap',
});

const playfair = Playfair_Display({
	subsets: ['latin'],
	variable: '--font-serif',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Root & Loom | Sustainable Luxury',
	description: 'Weaving tradition into modern luxury. Sustainable, ethical, and crafted for the contemporary journey.',
};

import { PHProvider } from '@/lib/analytics/posthog';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${inter.variable} ${playfair.variable}`}>
			<body className="min-h-screen bg-background font-sans antialiased">
				<PHProvider>
					<QueryProvider>
						<SupabaseAuthProvider>
							<WishlistProvider>
								<CartProvider>
									<div className="relative flex min-h-screen flex-col">
										<Suspense fallback={<div className="h-16 md:h-20" />}>
											<Header />
										</Suspense>
										<main className="flex-1">
											{children}
										</main>
										<Footer />
									</div>
									<Toaster position="top-center" />
								</CartProvider>
							</WishlistProvider>
						</SupabaseAuthProvider>
					</QueryProvider>
				</PHProvider>
			</body>
		</html>
	);
}