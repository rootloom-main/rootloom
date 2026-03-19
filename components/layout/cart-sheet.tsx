'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { formatPrice } from "@/lib/utils/format";
import { getProductPrice } from "@/lib/utils/pricing";
import { Minus, Plus, Trash2, ShoppingBag, Check } from "lucide-react";
import { useState, useEffect } from 'react';
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function CartSheet() {
    const { 
        cart, 
        isCartOpen, 
        setIsCartOpen, 
        updateCartItem, 
        removeFromCart, 
        cartCount,
        selectedItemIds,
        toggleItemSelection,
        toggleAllSelection,
        selectedCartTotal,
        selectedCartCount,
        isAllSelected,
        isIndeterminate
    } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-heirloom-white">
                <SheetHeader className="p-4 border-b border-woven-sand/50 bg-stone-paper/30">
                    <SheetTitle className="flex items-center justify-between font-serif text-deep-forest text-xl">
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5" />
                            Your Cart ({mounted ? cartCount : 0})
                        </div>
                        {cart.length > 0 && (
                            <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-widest text-slate-bark pr-10">
                                <span>Select All</span>
                                <Checkbox 
                                    checked={isAllSelected}
                                    onCheckedChange={() => toggleAllSelection()}
                                    className="border-stone-400 data-[state=checked]:bg-deep-forest data-[state=checked]:border-deep-forest"
                                />
                            </div>
                        )}
                    </SheetTitle>
                </SheetHeader>

                {!mounted || cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-stone-paper rounded-full flex items-center justify-center text-stone-400">
                            <ShoppingBag className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium text-deep-forest">Your cart is empty</h3>
                            <p className="text-sm text-slate-bark">Looks like you haven&apos;t added anything yet.</p>
                        </div>
                        <Button
                            onClick={() => setIsCartOpen(false)}
                            variant="outline"
                            className="mt-4 border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-heirloom-white"
                        >
                            Continue Shopping
                        </Button>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-6">
                                {cart.map((item) => {
                                    const price = getProductPrice(item.product, item.variant);
                                    const isSelected = selectedItemIds.includes(item.id);

                                    return (
                                        <div key={item.id} className={cn(
                                            "flex gap-3 p-2 rounded-sm transition-all duration-300",
                                            isSelected ? "bg-white shadow-sm" : "opacity-60 grayscale-[0.5]"
                                        )}>
                                            <div className="flex items-center">
                                                <Checkbox 
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleItemSelection(item.id)}
                                                    className="h-4 w-4 border-stone-300 data-[state=checked]:bg-deep-forest data-[state=checked]:border-deep-forest"
                                                />
                                            </div>

                                            <div className="relative w-16 h-20 bg-stone-100 rounded-sm overflow-hidden flex-shrink-0 border border-stone-200">
                                                {item.product.product_images[0] ? (
                                                    <Image
                                                        src={item.product.product_images[0].image_url}
                                                        alt={item.product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-stone-100">
                                                        <ShoppingBag className="w-5 h-5 text-stone-300" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col justify-between">
                                                <div className="space-y-0.5">
                                                    <h4 className="font-medium text-xs text-deep-forest line-clamp-1">{item.product.name}</h4>
                                                    <p className="text-[10px] text-slate-bark">
                                                        {item.variant.size} / {item.variant.color}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between mt-1">
                                                    <div className="flex items-center border border-woven-sand rounded-sm bg-white">
                                                        <button
                                                            className="px-1 py-0.5 hover:bg-stone-50 text-deep-forest disabled:opacity-50"
                                                            onClick={() => updateCartItem(item.id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <Minus className="w-2.5 h-2.5" />
                                                        </button>
                                                        <span className="text-[10px] w-5 text-center font-medium">{item.quantity}</span>
                                                        <button
                                                            className="px-1 py-0.5 hover:bg-stone-50 text-deep-forest"
                                                            onClick={() => updateCartItem(item.id, item.quantity + 1)}
                                                        >
                                                            <Plus className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-deep-forest">{formatPrice(price * item.quantity)}</span>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-stone-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        <div className="p-4 bg-white border-t border-woven-sand space-y-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-10">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-bark">Items Selected</span>
                                    <span className="font-bold text-deep-forest">{selectedCartCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-bark">Subtotal</span>
                                    <span className="font-medium text-deep-forest">{formatPrice(selectedCartTotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-bark">Shipping</span>
                                    <span className="text-green-600 font-medium">{selectedCartTotal > 999 ? 'Free' : 'Calculated at checkout'}</span>
                                </div>
                                <Separator className="bg-stone-100" />
                                <div className="flex justify-between text-base font-bold">
                                    <span className="text-deep-forest">Check Total</span>
                                    <span className="text-deep-forest">{formatPrice(selectedCartTotal)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full border-deep-forest text-deep-forest hover:bg-stone-50 text-xs font-bold tracking-widest uppercase"
                                    onClick={() => setIsCartOpen(false)}
                                    asChild
                                >
                                    <Link href="/cart">View Full Cart</Link>
                                </Button>
                                <Button
                                    className="w-full bg-deep-forest text-heirloom-white hover:bg-deep-forest/90 text-xs font-bold tracking-widest uppercase disabled:opacity-50 disabled:bg-stone-400"
                                    asChild
                                    onClick={() => setIsCartOpen(false)}
                                    disabled={selectedCartCount === 0}
                                >
                                    <Link href={selectedCartCount > 0 ? "/checkout" : "#"}>
                                        {selectedCartCount === 0 ? "Select Items" : "Checkout"}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
