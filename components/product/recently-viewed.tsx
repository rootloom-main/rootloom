'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    image_url: string;
}

export function RecentlyViewed({ currentProductId }: { currentProductId: string }) {
    const [recentProducts, setRecentProducts] = useState<Product[]>([]);

    useEffect(() => {
        // Load from localStorage
        const stored = localStorage.getItem('recentlyViewed');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Filter out current product and limit to 6
                setRecentProducts(parsed.filter((p: Product) => p.id !== currentProductId).slice(0, 6));
            } catch (e) {
                console.error('Failed to parse recently viewed', e);
            }
        }
    }, [currentProductId]);

    if (recentProducts.length === 0) return null;

    return (
        <section className="mt-16 pt-16 border-t border-stone-100">
            <h2 className="text-2xl font-bold font-serif text-deep-forest mb-8">Recently Viewed</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {recentProducts.map((product) => (
                    <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        className="group block"
                    >
                        <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-stone-50 border border-stone-100 mb-3">
                            <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <h3 className="text-sm font-medium text-stone-900 group-hover:text-deep-forest truncate">
                            {product.name}
                        </h3>
                        <p className="text-sm font-bold text-stone-700 mt-1">
                            {formatPrice(product.base_price)}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
