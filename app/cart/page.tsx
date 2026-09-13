'use client';

import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CartItem } from '@/components/cart/cart-item';
import { PriceDetails } from '@/components/cart/price-details';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils/format';
import { getProductPrice } from '@/lib/utils/pricing';
import { Checkbox } from '@/components/ui/checkbox';

export default function CartPage() {
  const { 
    cart, 
    cartCount, 
    isLoading: cartLoading,
    selectedCartCount,
    selectedCartTotal,
    toggleAllSelection,
    isAllSelected,
    isIndeterminate
  } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    if (selectedCartCount === 0) return;
    if (!user) {
      router.push('/auth/login?next=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  const shipping = selectedCartTotal > 999 ? 0 : 50;
  const total = selectedCartTotal + shipping;

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
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-heirloom-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShoppingBag className="h-10 w-10 text-deep-forest/40" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-medium text-deep-forest mb-3">Your cart is empty</h2>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
              Looks like you haven&apos;t discovered our collection yet. Find pieces that speak to you.
            </p>
            <Link href="/shop">
              <Button className="min-w-[200px] bg-deep-forest hover:bg-deep-forest/90 text-white h-12 rounded-full text-base">
                Start Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen pb-28 lg:pb-12">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-serif font-bold text-deep-forest">Your Collection ({cartCount})</h1>
          
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-sm border border-stone-200">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-bark">Select All Items</span>
            <Checkbox 
                checked={isAllSelected}
                onCheckedChange={() => toggleAllSelection()}
                className="h-5 w-5 border-stone-300 data-[state=checked]:bg-deep-forest data-[state=checked]:border-deep-forest"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
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
              subtotal={selectedCartTotal}
              shipping={shipping}
              total={total}
              itemCount={selectedCartCount}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 sm:p-4 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.1)] flex justify-between items-center z-50"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex flex-col">
          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest leading-none mb-1">
            Total ({selectedCartCount} {selectedCartCount === 1 ? 'item' : 'items'})
          </p>
          <p className="text-lg sm:text-xl font-bold text-deep-forest leading-none">{formatPrice(total)}</p>
        </div>
        <Button
          className="min-w-[140px] sm:min-w-[180px] bg-deep-forest hover:bg-deep-forest/90 text-white font-bold uppercase tracking-wider text-xs sm:text-sm h-11 sm:h-12 rounded-sm disabled:bg-stone-300 disabled:opacity-50 transition-colors shadow-sm"
          onClick={handleCheckout}
          disabled={selectedCartCount === 0}
        >
          {selectedCartCount === 0 ? 'Select Items' : 'Checkout Now'}
        </Button>
      </div>
    </div>
  );
}

