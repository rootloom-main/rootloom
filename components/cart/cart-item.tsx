'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { useCart } from '@/components/providers/cart-provider'; // Adjust import if needed

interface CartItemProps {
    item: any; // Replace with proper type from your types/index.ts
}

export function CartItem({ item }: CartItemProps) {
    const { updateCartItem, removeFromCart } = useCart();

    const price = item.product.base_price + (item.variant.price_adjustment || 0);
    const imageUrl =
        item.product.product_images?.[0]?.image_url ||
        'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=400';

    return (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-sm shadow-sm border border-stone-200">
            {/* Image Section */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 mx-auto sm:mx-0">
                <Image
                    src={imageUrl}
                    alt={item.product.name}
                    fill
                    className="object-cover rounded-sm"
                />
            </div>

            {/* Info Section */}
            <div className="flex-1 flex flex-col justify-between">
                <div>
                    <Link
                        href={`/product/${item.product.slug}`}
                        className="font-medium text-lg text-deep-forest hover:text-primary transition-colors line-clamp-2"
                    >
                        {item.product.name}
                    </Link>
                    <div className="mt-1 text-sm text-slate-bark flex items-center gap-2">
                        <span>Size: {item.variant.size}</span>
                        <span className="w-1 h-1 bg-stone-300 rounded-full" />
                        <span>Color: {item.variant.color}</span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl font-bold text-deep-forest">
                            {formatPrice(price)}
                        </span>
                        {/* Placeholder for MRP if available in future */}
                        {/* <span className="text-sm text-slate-400 line-through">₹{mrp}</span> */}
                        {/* <span className="text-sm text-green-600 font-medium">X% off</span> */}
                    </div>
                </div>

                {/* Actions Section (Mobile: Stacked, Desktop: Inline) */}
                <div className="mt-4 flex items-center gap-6">
                    {/* Quantity Control */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-stone-300"
                            onClick={() => updateCartItem(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium border-stone-200 bg-white">
                            {item.quantity}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-stone-300"
                            onClick={() => updateCartItem(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.variant.stock}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    {/* Remove Action */}
                    <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-base font-medium text-deep-forest hover:text-red-600 uppercase transition-colors"
                    >
                        Remove
                    </button>
                </div>
            </div>

            {item.variant.stock <= 5 && (
                <div className="text-xs text-orange-600 font-medium">
                    Only {item.variant.stock} left
                </div>
            )}
        </div>
    );
}
