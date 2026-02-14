'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleWishlist } from '@/lib/actions/wishlist';

interface WishlistItemProps {
    item: {
        id: string; // Wishlist ID
        product: {
            id: string;
            name: string;
            slug: string;
            base_price: number;
            product_images: {
                image_url: string;
                alt_text: string;
            }[];
            // Add stock status if available in future, for now assume in stock
        };
    };
    onRemove: () => void; // Callback to refresh or update UI
}

export function WishlistItem({ item, onRemove }: WishlistItemProps) {
    const { product } = item;
    const image = product.product_images?.[0]?.image_url || '/placeholder.png'; // Fallback
    const alt = product.product_images?.[0]?.alt_text || product.name;

    const router = useRouter();
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async () => {
        setIsRemoving(true);
        const result = await toggleWishlist(product.id);
        if (result.success) {
            router.refresh();
        }
        setIsRemoving(false);
    };

    return (
        <div className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white rounded-xl border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all duration-300">
            {/* Image */}
            <Link href={`/product/${product.slug}`} className="relative aspect-[3/4] sm:aspect-square w-full sm:w-24 md:w-32 rounded-lg overflow-hidden bg-stone-50 flex-shrink-0">
                <Image
                    src={image}
                    alt={alt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
            </Link>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start">
                    <Link href={`/product/${product.slug}`} className="block">
                        <h3 className="text-lg font-serif font-medium text-deep-forest hover:text-raw-clay transition-colors truncate pr-8">
                            {product.name}
                        </h3>
                    </Link>
                    {/* Remove Button (Desktop) */}
                    <button
                        onClick={handleRemove}
                        className="hidden sm:flex text-slate-400 hover:text-red-500 transition-colors p-1"
                        aria-label="Remove from wishlist"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-2">High Quality Cotton</p> {/* Placeholder category/desc */}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                    <span className="text-lg font-semibold text-deep-forest">
                        ₹{product.base_price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        In Stock
                    </span>
                </div>
            </div>

            {/* Actions (Mobile & Desktop) */}
            <div className="w-full sm:w-auto flex sm:flex-col gap-3 mt-4 sm:mt-0 sm:ml-4 border-t sm:border-t-0 p-4 sm:p-0 border-dashed border-stone-200">
                <Button className="flex-1 sm:w-full bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full">
                    <ShoppingBag size={18} className="mr-2" />
                    Add to Cart
                </Button>

                {/* Remove Button (Mobile) */}
                <Button
                    variant="outline"
                    onClick={handleRemove}
                    className="sm:hidden flex-1 border-stone-200 text-slate-500 hover:text-red-500 hover:border-red-200 rounded-full"
                >
                    Remove
                </Button>
            </div>
        </div>
    );
}
