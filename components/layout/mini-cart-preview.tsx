'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/components/providers/cart-provider'; // Actually, we'll pass props to avoid circular dependency if needed, but it's fine.

interface MiniCartPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
}

export function MiniCartPreview({ isOpen, onClose, item }: MiniCartPreviewProps) {
    const [mounted, setMounted] = useState(false);
    const { cartCount } = useCart();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (isOpen) {
            timeout = setTimeout(() => {
                onClose();
            }, 5000); // Auto close after 5s
        }
        return () => clearTimeout(timeout);
    }, [isOpen, onClose]);

    if (!mounted || !item) return null;

    return (
        <div
            className={cn(
                'fixed bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-500 ease-out sm:max-w-md sm:left-auto sm:top-4 sm:bottom-auto pointer-events-none',
                isOpen ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-[120%]'
            )}
        >
            <div className="bg-white rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-2xl border border-stone-100 overflow-hidden pointer-events-auto">
                {/* Header */}
                <div className="bg-green-50/50 px-4 py-3 flex items-center justify-between border-b border-green-100/50">
                    <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        Added to Cart
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-green-100 rounded-full text-green-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex gap-4">
                    <div className="relative w-16 h-20 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 border border-stone-200">
                        {item.product?.product_images?.[0] ? (
                            <Image
                                src={item.product.product_images[0].image_url}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                            />
                        ) : null}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                        <h4 className="font-bold text-sm text-deep-forest truncate">{item.product?.name}</h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                            {item.variant?.size} / {item.variant?.color} • Qty {item.quantity}
                        </p>
                        <p className="text-sm font-bold text-deep-forest mt-1.5">
                            {formatPrice((item.product?.base_price || 0) + (item.variant?.price_adjustment || 0))}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-3 pb-safe">
                    <Button variant="outline" className="w-full border-stone-200 text-stone-600 font-semibold h-11 rounded-xl" asChild onClick={onClose}>
                        <Link href="/cart">View Cart ({cartCount})</Link>
                    </Button>
                    <Button className="w-full bg-deep-forest text-white hover:bg-deep-forest/90 font-bold h-11 rounded-xl shadow-md" asChild onClick={onClose}>
                        <Link href="/checkout">
                            Checkout <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
