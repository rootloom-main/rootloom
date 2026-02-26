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
import { getCurrentUser, isAdmin as checkIsAdmin } from '@/lib/utils/auth';

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

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await getCurrentUser();
	const isAdmin = await checkIsAdmin();

	return (
		<html lang="en" className={`${inter.variable} ${playfair.variable}`}>
			<body className="min-h-screen bg-background font-sans antialiased">
				<PHProvider>
					<QueryProvider>
						<SupabaseAuthProvider>
							<WishlistProvider>
								<CartProvider>
									<div className="relative flex min-h-screen flex-col">
										<Header user={user} isAdmin={isAdmin} />
										<main className="flex-1">
											{children}
										</main>
										<Footer />
									</div>
									<Toaster />
								</CartProvider>
							</WishlistProvider>
						</SupabaseAuthProvider>
					</QueryProvider>
				</PHProvider>
			</body>
		</html>
	);
}