'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { useCart } from '@/components/providers/cart-provider';
import { getProductPrice, calculateMRP } from '@/lib/utils/pricing';
import { toast } from 'sonner';

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
            product_variants?: {
                id: string;
                price_adjustment: number;
                stock: number;
            }[];
        };
    };
}

export function WishlistItem({ item }: WishlistItemProps) {
    const { product } = item;
    const { removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();

    const image = product.product_images?.[0]?.image_url || '/placeholder.png';
    const alt = product.product_images?.[0]?.alt_text || product.name;

    const router = useRouter();
    const [isRemoving, setIsRemoving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const displayPrice = getProductPrice(product);
    const mrp = calculateMRP(displayPrice);

    const handleRemove = async () => {
        setIsRemoving(true);
        try {
            await removeFromWishlist(product.id);
            toast.success('Removed from wishlist');
            router.refresh();
        } catch (error) {
            toast.error('Failed to remove item');
        } finally {
            setIsRemoving(false);
        }
    };

    const handleAddToCart = async () => {
        setIsAdding(true);
        try {
            // Find the first available variant
            const variant = product.product_variants?.find(v => v.stock > 0) || product.product_variants?.[0];

            if (!variant) {
                toast.error('Product is currently out of stock');
                return;
            }

            await addToCart({
                productId: product.id,
                variantId: variant.id,
                quantity: 1,
                productData: {
                    name: product.name,
                    slug: product.slug,
                    base_price: product.base_price,
                    product_images: product.product_images
                },
                variantData: {
                    size: (variant as any).size || '',
                    color: (variant as any).color || '',
                    price_adjustment: variant.price_adjustment,
                    stock: variant.stock
                }
            });
            toast.success('Added to cart');
        } catch (error) {
            console.error('Wishlist AddToCart Error:', error);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="group relative flex flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all duration-300">
            {/* Image */}
            <Link href={`/product/${product.slug}`} className="relative aspect-[3/4] w-20 sm:w-24 md:w-32 rounded-lg overflow-hidden bg-stone-50 flex-shrink-0">
                <Image
                    src={image}
                    alt={alt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
            </Link>

            {/* Content & Actions */}
            <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                <div className="space-y-1">
                    <div className="flex justify-between items-start">
                        <Link href={`/product/${product.slug}`} className="block flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base md:text-lg font-serif font-medium text-deep-forest hover:text-raw-clay transition-colors truncate pr-2">
                                {product.name}
                            </h3>
                        </Link>
                        {/* Remove Button */}
                        <button
                            onClick={handleRemove}
                            disabled={isRemoving}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                            aria-label="Remove from wishlist"
                        >
                            {isRemoving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <X size={18} className="sm:h-5 sm:w-5" />
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-slate-500">High Quality Cotton</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                    {/* Price and Stock */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base md:text-lg font-semibold text-deep-forest">
                            ₹{displayPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs sm:text-sm text-stone-400 line-through">
                            ₹{mrp.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] sm:text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            In Stock
                        </span>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                        onClick={handleAddToCart}
                        disabled={isAdding}
                        className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full h-8 sm:h-10 px-4 sm:px-6 text-xs sm:text-sm font-medium w-full sm:w-auto flex items-center justify-center"
                    >
                        {isAdding ? (
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                            <>
                                <ShoppingBag size={14} className="mr-1.5 sm:h-[16px] sm:w-[16px]" />
                                Add to Cart
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
