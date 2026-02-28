import { ProductCard } from '@/components/product/product-card';
import { ChevronRight, Leaf } from 'lucide-react';
import Link from 'next/link';

interface RelatedProductsProps {
    products: any[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
    if (!products || products.length === 0) return null;

    return (
        <div className="mt-14">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-6 lg:px-10 pt-8 pb-6 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <Leaf className="w-4 h-4 text-moss-olive" />
                            <Leaf className="w-3 h-3 text-moss-olive/60 -ml-1" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-moss-olive uppercase tracking-widest mb-0.5">You Might Love</p>
                            <h2 className="text-2xl font-bold font-serif text-deep-forest">Similar Picks</h2>
                        </div>
                    </div>
                    <Link
                        href="/shop"
                        className="text-sm font-semibold text-moss-olive hover:text-deep-forest flex items-center gap-1 transition-colors group"
                    >
                        View All
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>

                {/* Products Grid */}
                <div className="p-6 lg:p-10">
                    <div className="flex overflow-x-auto pb-4 -mx-2 px-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 scrollbar-hide snap-x">
                        {products.map((product) => (
                            <div key={product.id} className="min-w-[220px] md:min-w-0 snap-start mr-4 md:mr-0">
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
