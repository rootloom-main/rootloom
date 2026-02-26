'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { Star, ShoppingCart, ArrowRight } from 'lucide-react';
import { WishlistButton } from '@/components/product/wishlist-button';

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    description?: string;
    product_images: Array<{ image_url: string; alt_text: string | null }>;
}

interface QuickViewModalProps {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QuickViewModal({ product, open, onOpenChange }: QuickViewModalProps) {
    const imageUrl = product.product_images?.[0]?.image_url || '/placeholder.png';
    const rating = 4.5;
    const reviewCount = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50 + 10;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white gap-0 border-stone-200">
                <DialogHeader className="sr-only">
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>
                <div className="grid md:grid-cols-2">
                    {/* Image Section */}
                    <div className="relative aspect-square md:aspect-auto bg-stone-100">
                        <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="absolute top-4 right-4 z-10">
                            <div className="bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-sm hover:bg-white transition-colors">
                                <WishlistButton productId={product.id} />
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 md:p-8 flex flex-col justify-center bg-white">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-deep-forest leading-tight mb-2">
                                    {product.name}
                                </h2>
                                <div className="flex items-center gap-1.5 mb-4">
                                    <div className="flex text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-current' : 'text-stone-200'}`} />
                                        ))}
                                    </div>
                                    <span className="text-sm font-medium text-stone-600">({reviewCount} reviews)</span>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-bold text-deep-forest">
                                    {formatPrice(product.base_price)}
                                </span>
                                {product.base_price > 1000 && (
                                    <span className="text-sm text-stone-400 line-through">
                                        {formatPrice(product.base_price * 1.2)}
                                    </span>
                                )}
                            </div>

                            <p className="text-stone-600 text-sm leading-relaxed line-clamp-3">
                                {product.description || "Crafted with precision, this premium item perfectly balances style and comfort. Experience Root & Loom quality in every detail."}
                            </p>

                            <div className="pt-6 space-y-3">
                                <Button
                                    className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white rounded-md h-12 text-base font-semibold"
                                >
                                    <ShoppingCart className="w-5 h-5 mr-3" /> Add to Cart
                                </Button>
                                <Link href={`/product/${product.slug}`} className="block w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full border-stone-200 hover:bg-stone-50 text-stone-700 rounded-md h-12 text-base font-medium"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        View Full Details <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
