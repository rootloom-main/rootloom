'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { formatPrice } from "@/lib/utils/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function CartSheet() {
    const { cart, isCartOpen, setIsCartOpen, updateCartItem, removeFromCart, cartCount } = useCart();

    const subtotal = cart.reduce((total, item) => {
        const price = item.product.base_price + item.variant.price_adjustment;
        return total + price * item.quantity;
    }, 0);

    return (
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-heirloom-white">
                <SheetHeader className="p-4 border-b border-woven-sand/50 bg-stone-paper/30">
                    <SheetTitle className="flex items-center gap-2 font-serif text-deep-forest text-xl">
                        <ShoppingBag className="w-5 h-5" />
                        Your Cart ({cartCount})
                    </SheetTitle>
                </SheetHeader>

                {cart.length === 0 ? (
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
                            <div className="space-y-4">
                                {cart.map((item) => {
                                    const price = item.product.base_price + item.variant.price_adjustment;

                                    return (
                                        <div key={item.id} className="flex gap-4">
                                            <div className="relative w-20 h-24 bg-stone-100 rounded-sm overflow-hidden flex-shrink-0 border border-stone-200">
                                                {item.product.product_images[0] ? (
                                                    <Image
                                                        src={item.product.product_images[0].image_url}
                                                        alt={item.product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-stone-100">
                                                        <ShoppingBag className="w-6 h-6 text-stone-300" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 flex flex-col justify-between">
                                                <div className="space-y-1">
                                                    <h4 className="font-medium text-sm text-deep-forest line-clamp-2">{item.product.name}</h4>
                                                    <p className="text-xs text-slate-bark">
                                                        {item.variant.size} / {item.variant.color}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center border border-woven-sand rounded-sm bg-white">
                                                        <button
                                                            className="p-1 hover:bg-stone-50 text-deep-forest disabled:opacity-50"
                                                            onClick={() => updateCartItem(item.id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs w-6 text-center font-medium">{item.quantity}</span>
                                                        <button
                                                            className="p-1 hover:bg-stone-50 text-deep-forest"
                                                            onClick={() => updateCartItem(item.id, item.quantity + 1)}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-semibold text-deep-forest">{formatPrice(price * item.quantity)}</span>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-stone-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
                                    <span className="text-slate-bark">Subtotal</span>
                                    <span className="font-medium text-deep-forest">{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-bark">Shipping</span>
                                    <span className="text-green-600 font-medium">Free</span>
                                </div>
                                <Separator className="bg-stone-100" />
                                <div className="flex justify-between text-base font-bold">
                                    <span className="text-deep-forest">Total</span>
                                    <span className="text-deep-forest">{formatPrice(subtotal)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full border-deep-forest text-deep-forest hover:bg-stone-50"
                                    onClick={() => {
                                        setIsCartOpen(false);
                                        // Optional: navigate to cart
                                    }}
                                    asChild
                                >
                                    <Link href="/cart">View Cart</Link>
                                </Button>
                                <Button
                                    className="w-full bg-deep-forest text-heirloom-white hover:bg-deep-forest/90"
                                    asChild
                                    onClick={() => setIsCartOpen(false)}
                                >
                                    <Link href="/checkout">Checkout</Link>
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
