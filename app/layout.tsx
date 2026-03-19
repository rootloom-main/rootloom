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
	metadataBase: new URL('https://rootloom.in'),
	title: 'Root & Loom | Rooted in Vibes. Loomed for the Journey.',
	description: 'Sustainable streetwear with main character energy. Weaving Gen Z heritage into modern drip. Ethical, viral, and crafted for your aesthetic journey.',
	keywords: ['Aesthetic Streetwear', 'Sustainable Fashion Gen Z', 'Main Character Energy Clothes', 'Ethical Drip', 'Root & Loom Heritage', 'Viral Fashion 2026', 'Y2K Revival', 'Eco-conscious Luxury'],
	openGraph: {
		title: 'Root & Loom | Rooted in Vibes. Loomed for the Journey.',
		description: 'Sustainable streetwear with main character energy. Ethical drip for the contemporary journey.',
		url: 'https://rootloom.in',
		siteName: 'Root & Loom',
		images: [
			{
				url: '/og-image.jpg',
				width: 1200,
				height: 630,
				alt: 'Root & Loom - Sustainable Streetwear',
			},
		],
		locale: 'en_IN',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Root & Loom | Rooted in Vibes. Loomed for the Journey.',
		description: 'Sustainable streetwear with main character energy. Ethical drip for the contemporary journey.',
		images: ['/og-image.jpg'],
		creator: '@rootloom.in',
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	alternates: {
		canonical: 'https://rootloom.in',
	},
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#ffffff' },
		{ media: '(prefers-color-scheme: dark)', color: '#000000' },
	],
	viewport: {
		width: 'device-width',
		initialScale: 1,
		maximumScale: 5,
		userScalable: true,
	},
	manifest: '/manifest.json',
};

const jsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Organization',
	name: 'Root & Loom',
	url: 'https://rootloom.in',
	logo: 'https://rootloom.in/logo.png',
	sameAs: [
		'https://instagram.com/rootloom.in',
		'https://facebook.com/share/1D1ZrHGpBb',
		'https://wa.me/919913555532',
	],
};

const localBusinessJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'ClothingStore',
	name: 'Root & Loom',
	url: 'https://rootloom.in',
	logo: 'https://rootloom.in/logo.png',
	image: 'https://rootloom.in/hero.png',
	description: 'The premier online destination for aesthetic streetwear and sustainable fashion.',
	telephone: '+919913555532',
	address: {
		'@type': 'PostalAddress',
		streetAddress: 'Shri Ram Folding Works, Shri Ram Industries park-3, Shed 19 Near Vaishalinagar OPP Cozy Hotel Shahwadi, Narol',
		addressLocality: 'Ahmedabad',
		addressRegion: 'Gujarat',
		postalCode: '382405',
		addressCountry: 'IN',
	},
	geo: {
		'@type': 'GeoCoordinates',
		latitude: '22.9734',
		longitude: '72.5850',
	},
	openingHoursSpecification: [
		{
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
			opens: '09:00',
			closes: '19:00',
		},
	],
	priceRange: '₹₹',
};

const websiteJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	name: 'Root & Loom',
	url: 'https://rootloom.in',
	potentialAction: {
		'@type': 'SearchAction',
		target: 'https://rootloom.in/shop?search={search_term_string}',
		'query-input': 'required name=search_term_string',
	},
};

import { PHProvider } from '@/lib/analytics/posthog';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
				/>
			</head>
			<body className="min-h-screen bg-background font-sans antialiased">
				<PHProvider>
					<QueryProvider>
						<SupabaseAuthProvider>
							<WishlistProvider>
								<CartProvider>
									<div className="relative flex min-h-screen flex-col">
										<div className="bg-black text-white py-2 px-4 text-center text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase">
											⚡ Rooted in Vibes. Loomed for the Journey. | Free Shipping over ₹999 ⚡
										</div>
										<Suspense fallback={
											<header className="sticky top-0 z-50 w-full h-16 md:h-20 bg-transparent border-b border-transparent">
												<div className="container mx-auto px-1 sm:px-4 h-full flex items-center justify-between" />
											</header>
										}>
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