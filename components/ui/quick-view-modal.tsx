'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { Star, ShoppingCart, ArrowRight, Check, Info } from 'lucide-react';
import { WishlistButton } from '@/components/product/wishlist-button';
import { useCart } from '@/components/providers/cart-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface ProductVariant {
    id: string;
    size: string;
    color: string;
    stock: number;
    price_adjustment: number;
}

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    description?: string;
    product_images: Array<{ image_url: string; alt_text: string | null }>;
    product_variants?: ProductVariant[];
}

interface QuickViewModalProps {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QuickViewModal({ product, open, onOpenChange }: QuickViewModalProps) {
    const { addToCart } = useCart();
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [isAdding, setIsAdding] = useState(false);

    const imageUrl = product.product_images?.[0]?.image_url || '/placeholder.png';
    const rating = 4.5;
    const reviewCount = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50 + 10;

    const variants = product.product_variants || [];
    const uniqueSizes = Array.from(new Set(variants.map((v) => v.size)));
    const uniqueColors = Array.from(new Set(variants.map((v) => v.color)));

    const selectedVariant = variants.find(
        (v) => v.size === selectedSize && v.color === selectedColor
    );

    const finalPrice = selectedVariant ? product.base_price + selectedVariant.price_adjustment : product.base_price;

    const handleAddToCart = async () => {
        if (!selectedSize || !selectedColor) {
            toast.error('Please select size and color');
            return;
        }

        if (!selectedVariant) {
            toast.error('Selected variant not available');
            return;
        }

        setIsAdding(true);
        try {
            await addToCart({
                productId: product.id,
                variantId: selectedVariant.id,
                quantity: 1,
                productData: {
                    name: product.name,
                    slug: product.slug,
                    base_price: product.base_price,
                    product_images: product.product_images
                },
                variantData: {
                    size: selectedSize,
                    color: selectedColor,
                    price_adjustment: selectedVariant.price_adjustment,
                    stock: selectedVariant.stock
                }
            });
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to add to cart');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-white gap-0 border-stone-200 shadow-2xl rounded-2xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>{product.name}</DialogTitle>
                </DialogHeader>
                <div className="grid md:grid-cols-2">
                    {/* Image Section */}
                    <div className="relative aspect-square md:aspect-auto bg-stone-50 overflow-hidden">
                        <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-700 hover:scale-110"
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        <div className="absolute top-4 right-4 z-10">
                            <WishlistButton productId={product.id} />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 md:p-10 flex flex-col bg-white">
                        <div className="flex-1 space-y-6">
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-deep-forest leading-tight mb-2">
                                    {product.name}
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'fill-current' : 'text-stone-200'}`} />
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-stone-400 tracking-widest uppercase">({reviewCount} reviews)</span>
                                </div>
                            </div>

                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-bold text-deep-forest tracking-tight">
                                    {formatPrice(finalPrice)}
                                </span>
                                {product.base_price > 1000 && (
                                    <span className="text-sm text-stone-300 line-through decoration-stone-300">
                                        {formatPrice(finalPrice * 1.25)}
                                    </span>
                                )}
                            </div>

                            {/* Size Selector */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-bold tracking-widest uppercase text-stone-500">Select Size</Label>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {uniqueSizes.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            className={cn(
                                                "h-10 w-12 rounded-lg border-2 text-xs font-bold transition-all duration-200",
                                                selectedSize === size
                                                    ? "border-deep-forest bg-deep-forest text-white shadow-md scale-105"
                                                    : "border-stone-100 bg-stone-50/50 text-stone-600 hover:border-stone-200"
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Selector */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-bold tracking-widest uppercase text-stone-500">Select Color</Label>
                                <div className="flex flex-wrap gap-2">
                                    {uniqueColors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={cn(
                                                "px-4 py-2 rounded-lg border-2 text-xs font-bold transition-all duration-200",
                                                selectedColor === color
                                                    ? "border-deep-forest bg-deep-forest/5 text-deep-forest shadow-sm"
                                                    : "border-stone-100 bg-stone-50/50 text-stone-600 hover:border-stone-200"
                                            )}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Stock Info */}
                            {selectedVariant && (
                                <div className={cn(
                                    "flex items-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg border",
                                    selectedVariant.stock > 0 && selectedVariant.stock <= 5
                                        ? "bg-red-50 text-red-600 border-red-100"
                                        : selectedVariant.stock === 0
                                            ? "bg-stone-100 text-stone-500 border-stone-200"
                                            : "bg-green-50 text-green-700 border-green-100"
                                )}>
                                    {selectedVariant.stock > 0 && selectedVariant.stock <= 5 ? (
                                        <>Only {selectedVariant.stock} left!</>
                                    ) : selectedVariant.stock === 0 ? (
                                        <>Out of stock</>
                                    ) : (
                                        <><Check className="w-3 h-3" /> In Stock & Ready to Ship</>
                                    )}
                                </div>
                            )}

                            <div className="pt-4 space-y-3">
                                <Button
                                    onClick={handleAddToCart}
                                    disabled={isAdding || (selectedVariant && selectedVariant.stock === 0)}
                                    className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white rounded-xl h-14 text-base font-bold shadow-lg shadow-deep-forest/10 active:scale-[0.98] transition-all"
                                >
                                    {isAdding ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Adding...
                                        </span>
                                    ) : (
                                        <>
                                            <ShoppingCart className="w-5 h-5 mr-3" /> Add to Cart
                                        </>
                                    )}
                                </Button>
                                <Link href={`/product/${product.slug}`} className="block w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl h-14 text-base font-semibold group transition-all"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        View Full Details
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
