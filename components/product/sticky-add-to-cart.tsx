'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

interface StickyAddToCartProps {
    product: any;
    selectedVariant: any;
    isAdding: boolean;
    onAddToCart: () => void;
}

export function StickyAddToCart({ product, selectedVariant, isAdding, onAddToCart }: StickyAddToCartProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // When target elements leaves viewport (isIntersecting is false), show sticky bar
                setIsVisible(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0,
                rootMargin: "-80px 0px 0px 0px" // Account for the header
            }
        );

        const target = document.getElementById('primary-add-to-cart');
        if (target) {
            observer.observe(target);
        }

        return () => {
            if (target) observer.unobserve(target);
            observer.disconnect();
        };
    }, []);

    if (!isVisible) return null;

    const price = selectedVariant
        ? product.base_price + selectedVariant.price_adjustment
        : product.base_price;

    return (
        <div className="fixed bottom-0 md:top-20 md:bottom-auto left-0 right-0 bg-white border-t md:border-t-0 md:border-b border-stone-200 p-3 md:py-2 z-40 animate-in slide-in-from-bottom-full md:slide-in-from-top-full duration-300 shadow-upper md:shadow-sm">
            <div className="container mx-auto px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        <Image
                            src={product.product_images[0]?.image_url || '/placeholder.png'}
                            alt={product.name}
                            fill
                            className="object-cover"
                        />
                    </div>

                    <div className="flex-1 min-w-0 hidden sm:block">
                        <h4 className="font-bold text-sm truncate text-deep-forest max-w-[200px] md:max-w-md">{product.name}</h4>
                        <p className="text-xs text-stone-500 truncate">{selectedVariant ? `${selectedVariant.color} • ${selectedVariant.size}` : 'Select options'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    <p className="text-sm font-bold text-deep-forest hidden min-[400px]:block">{formatPrice(price)}</p>
                    <Button
                        onClick={onAddToCart}
                        disabled={isAdding || !selectedVariant || selectedVariant.stock === 0}
                        className={cn(
                            "rounded-full px-6 shadow-sm",
                            (!selectedVariant || selectedVariant.stock === 0)
                                ? "bg-stone-200 text-stone-400"
                                : "bg-deep-forest text-white hover:bg-deep-forest/90"
                        )}
                    >
                        {isAdding ? 'ADDING...' : (!selectedVariant ? 'SELECT OPTIONS' : 'ADD TO CART')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
