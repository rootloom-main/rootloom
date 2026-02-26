import { ProductCard } from '@/components/product/product-card';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface RelatedProductsProps {
    products: any[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
    if (!products || products.length === 0) return null;

    return (
        <div className="mt-16 border-t pt-12 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold font-serif text-deep-forest">You Might Also Like</h2>
                <Link href="/shop" className="text-sm font-semibold text-moss-olive hover:text-deep-forest flex items-center gap-1">
                    See More <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Scrollable Container for Mobile, Grid for Desktop */}
            <div className="flex overflow-x-auto pb-6 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 scrollbar-hide snap-x">
                {products.map((product) => (
                    <div key={product.id} className="min-w-[240px] md:min-w-0 snap-start mr-4 md:mr-0">
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </div>
    );
}
