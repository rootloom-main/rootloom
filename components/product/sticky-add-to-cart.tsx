'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import { ShoppingCart } from 'lucide-react';

interface StickyAddToCartProps {
    product: any;
    selectedVariant: any;
    quantity?: number;
    isAdding: boolean;
    onAddToCart: () => void;
    onBuyNow: () => void;
}

export function StickyAddToCart({ product, selectedVariant, quantity = 1, isAdding, onAddToCart, onBuyNow }: StickyAddToCartProps) {
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { setIsVisible(!entry.isIntersecting); },
            { root: null, threshold: 0, rootMargin: '-80px 0px 0px 0px' }
        );
        const target = document.getElementById('primary-add-to-cart');
        if (target) observer.observe(target);
        return () => { if (target) observer.unobserve(target); observer.disconnect(); };
    }, []);

    if (!isVisible) return null;

    const price = selectedVariant
        ? product.base_price + selectedVariant.price_adjustment
        : product.base_price;

    return (
        <div
            className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[45] bg-white/98 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-full duration-300 w-full max-w-full"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="container mx-auto px-3 sm:px-4 max-w-screen-xl py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 w-full max-w-full">
                {/* Product thumbnail + info */}
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shrink-0 border border-stone-200">
                        <Image
                            src={product.product_images?.[0]?.image_url || '/placeholder.png'}
                            alt={product.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0 hidden sm:block">
                        <h4 className="font-bold text-sm text-deep-forest truncate max-w-[180px] lg:max-w-xs">{product.name}</h4>
                        <p className="text-xs text-stone-400 truncate">
                            {selectedVariant ? `${selectedVariant.color} • ${selectedVariant.size}` : 'Select options above'}
                        </p>
                    </div>
                    <span className="text-sm sm:text-base font-extrabold text-deep-forest hidden min-[400px]:block shrink-0">
                        {formatPrice(price)}
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={onAddToCart}
                        disabled={isAdding || (selectedVariant && selectedVariant.stock === 0)}
                        className={cn(
                            'rounded-xl font-bold text-xs md:text-sm px-3 sm:px-4 h-10 sm:h-11 transition-all shadow-sm shrink-0',
                            (selectedVariant && selectedVariant.stock === 0)
                                ? 'bg-stone-100 text-stone-300'
                                : 'bg-raw-clay text-white hover:bg-[#7a4e3c]'
                        )}
                    >
                        <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                        <span className="hidden min-[380px]:inline">{isAdding ? 'Adding...' : 'Add to Cart'}</span>
                        <span className="min-[380px]:hidden">Cart</span>
                    </Button>

                    <Button
                        onClick={onBuyNow}
                        disabled={isAdding || (selectedVariant && selectedVariant.stock === 0)}
                        className={cn(
                            'rounded-xl font-bold text-xs md:text-sm px-3.5 sm:px-5 h-10 sm:h-11 transition-all shadow-md shrink-0 uppercase tracking-wider',
                            (selectedVariant && selectedVariant.stock === 0)
                                ? 'bg-stone-200 text-stone-400 shadow-none'
                                : 'bg-deep-forest text-white hover:bg-slate-900 shadow-deep-forest/10 hover:shadow-lg hover:shadow-deep-forest/20'
                        )}
                    >
                        <span
                            key={selectedVariant?.id || 'empty'}
                            className={cn('inline-block', selectedVariant ? 'animate-micro-bounce' : '')}
                        >
                            {isAdding ? '...' : `⚡ Buy Now`}
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
