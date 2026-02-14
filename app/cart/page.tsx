'use client';

import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CartItem } from '@/components/cart/cart-item';
import { PriceDetails } from '@/components/cart/price-details';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const { cart, cartCount, isLoading: cartLoading } = useCart();
  const router = useRouter();

  const subtotal = cart.reduce((total, item) => {
    const price = item.product.base_price + (item.variant.price_adjustment || 0);
    return total + price * item.quantity;
  }, 0);

  const shipping = subtotal > 999 ? 0 : 50;
  const total = subtotal + shipping;

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-16 bg-stone-50 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-stone-300 border-t-deep-forest rounded-full" />
        </div>
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="container mx-auto px-4 py-16 bg-stone-50 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md shadow-sm border-stone-200">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="h-10 w-10 text-deep-forest/60" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-deep-forest">Your cart is empty</h2>
            <p className="text-slate-500 mb-8 max-w-xs">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link href="/shop" className="w-full max-w-xs">
              <Button className="w-full bg-deep-forest hover:bg-deep-forest/90">
                Start Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-24 lg:pb-12">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-deep-forest">My Cart ({cartCount})</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>

          {/* Right Column: Price Details */}
          <div className="lg:col-span-1">
            <PriceDetails
              cart={cart}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
              itemCount={cartCount}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-between items-center z-50">
        <div>
          <p className="text-xs text-slate-500 line-through">₹{total + 500}</p>
          <p className="text-lg font-bold text-deep-forest">₹{total}</p>
        </div>
        <Button
          className="w-1/2 bg-deep-forest hover:bg-deep-forest/90 text-white font-semibold uppercase tracking-wide h-12"
          onClick={() => router.push('/checkout')}
        >
          Place Order
        </Button>
      </div>
    </div>
  );
}

