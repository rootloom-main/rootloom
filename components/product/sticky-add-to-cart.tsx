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
    isAdding: boolean;
    onAddToCart: () => void;
}

export function StickyAddToCart({ product, selectedVariant, isAdding, onAddToCart }: StickyAddToCartProps) {
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

    const handleBuyNow = async () => {
        await onAddToCart();
        router.push('/checkout');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-full duration-300">
            <div className="container mx-auto px-4 max-w-screen-xl py-3 flex items-center gap-4">
                {/* Product thumbnail + info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-stone-200">
                        <Image
                            src={product.product_images[0]?.image_url || '/placeholder.png'}
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
                    <span className="text-base font-extrabold text-deep-forest hidden min-[400px]:block flex-shrink-0">
                        {formatPrice(price)}
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <Button
                        onClick={onAddToCart}
                        disabled={isAdding || !selectedVariant || selectedVariant?.stock === 0}
                        variant="outline"
                        className={cn(
                            'rounded-xl border-2 font-bold text-sm px-4 h-10 transition-all',
                            (!selectedVariant || selectedVariant?.stock === 0)
                                ? 'border-stone-200 text-stone-300'
                                : 'border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-white'
                        )}
                    >
                        <ShoppingCart className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline">{isAdding ? 'Adding...' : 'Add to Cart'}</span>
                        <span className="sm:hidden">Cart</span>
                    </Button>

                    <Button
                        onClick={handleBuyNow}
                        disabled={isAdding || !selectedVariant || selectedVariant?.stock === 0}
                        className={cn(
                            'rounded-xl font-bold text-sm px-5 h-10 transition-all',
                            (!selectedVariant || selectedVariant?.stock === 0)
                                ? 'bg-stone-200 text-stone-400'
                                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-900 shadow-sm'
                        )}
                    >
                        {isAdding ? '...' : '⚡ Buy Now'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
