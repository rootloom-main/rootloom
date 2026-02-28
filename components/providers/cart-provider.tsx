'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import {
  getCart,
  addToCart as addToCartAction,
  updateCartItem as updateCartItemAction,
  removeFromCart as removeFromCartAction,
  clearCart as clearCartAction
} from '@/lib/actions/cart';

interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  product: {
    name: string;
    slug: string;
    base_price: number;
    product_images: Array<{ image_url: string }>;
  };
  variant: {
    size: string;
    color: string;
    price_adjustment: number;
    stock: number;
  };
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  isLoading: boolean;
  addToCart: (productId: string, variantId: string, quantity: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();

  const fetchCart = async () => {
    if (!user) {
      setCart([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getCart();
      setCart((data as any) || []);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const addToCart = async (productId: string, variantId: string, quantity: number) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }

    try {
      const result = await addToCartAction(productId, variantId, quantity);
      if (!result.success) throw new Error(result.message);


      await fetchCart();
      setIsCartOpen(true);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error(error.message || 'Failed to add to cart');
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    try {
      const result = await updateCartItemAction(itemId, quantity);
      if (!result.success) throw new Error(result.message);

      await fetchCart();
      toast.success(result.message);
    } catch (error: any) {
      console.error('Error updating cart:', error);
      toast.error(error.message || 'Failed to update cart');
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const result = await removeFromCartAction(itemId);
      if (!result.success) throw new Error(result.message);

      await fetchCart();
      toast.success(result.message);
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      toast.error(error.message || 'Failed to remove from cart');
    }
  };

  const clearCart = async () => {
    if (!user) return;
    try {
      const result = await clearCartAction();
      if (!result.success) throw new Error(result.message);

      await fetchCart();
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast.error(error.message || 'Failed to clear cart');
    }
  };

  const refreshCart = async () => {
    await fetchCart();
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        isLoading,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        refreshCart,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
