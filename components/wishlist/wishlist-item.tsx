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
                        ₹{displayPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm text-stone-400 line-through">
                        ₹{mrp.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        In Stock
                    </span>
                </div>
            </div>

            {/* Actions (Mobile & Desktop) */}
            <div className="w-full sm:w-auto flex sm:flex-col gap-3 mt-4 sm:mt-0 sm:ml-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-dashed border-stone-200">
                <Button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="flex-1 sm:w-full bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full h-11"
                >
                    {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <ShoppingBag size={18} className="mr-2" />
                            Add to Cart
                        </>
                    )}
                </Button>

                {/* Remove Button (Mobile) */}
                <Button
                    variant="outline"
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="sm:hidden flex-1 border-stone-200 text-slate-500 hover:text-red-500 hover:border-red-200 rounded-full h-11"
                >
                    {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
                </Button>
            </div>
        </div>
    );
}
