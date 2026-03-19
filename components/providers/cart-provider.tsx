'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import {
  getCart,
  addToCart as addToCartAction,
  updateCartItem as updateCartItemAction,
  removeFromCart as removeFromCartAction,
  clearCart as clearCartAction,
  mergeCart
} from '@/lib/actions/cart';
import dynamic from 'next/dynamic';

const MiniCartPreview = dynamic(() => import('@/components/layout/mini-cart-preview').then(mod => mod.MiniCartPreview), { ssr: false });

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
  selectedItemIds: string[];
  isLoading: boolean;
  addToCart: (item: { productId: string, variantId: string, quantity: number, productData?: any, variantData?: any }) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  toggleItemSelection: (itemId: string) => void;
  toggleAllSelection: () => void;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  // Derived values for UI
  selectedCartItems: CartItem[];
  selectedCartCount: number;
  selectedCartTotal: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);
  const { user, loading: authLoading } = useAuth();
  const prevUser = useRef(user);

  // Persistence: Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('rootloom_cart_selections');
    if (saved) {
      try {
        setSelectedItemIds(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading cart selections:', e);
      }
    }
  }, []);

  // Persistence: Save to localStorage
  useEffect(() => {
    localStorage.setItem('rootloom_cart_selections', JSON.stringify(selectedItemIds));
  }, [selectedItemIds]);

  // Handle case where items are removed from cart but still in selectedItemIds
  useEffect(() => {
    const validIds = cart.map(item => item.id);
    setSelectedItemIds(prev => prev.filter(id => validIds.includes(id)));
  }, [cart]);

  // Guest Cart Logic
  const getGuestCart = () => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('rootloom_guest_cart');
    return saved ? JSON.parse(saved) : [];
  };

  const saveGuestCart = (items: CartItem[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('rootloom_guest_cart', JSON.stringify(items));
  };

  const fetchCart = async () => {
    if (!user) {
      const items = getGuestCart();
      setCart(items);
      // Default new items to selected
      const currentIds = selectedItemIds;
      const newIds = items.filter((i: CartItem) => !currentIds.includes(i.id)).map((i: CartItem) => i.id);
      if (newIds.length > 0) {
        setSelectedItemIds([...currentIds, ...newIds]);
      }
      setIsLoading(false);
      return;
    }

    try {
      const data = await getCart();
      const items = (data as any) || [];
      setCart(items);
      
      // Sync selected IDs
      const itemIds = items.map((i: any) => i.id);
      setSelectedItemIds(prev => {
        // Keep existing selections that are still valid, and add new items by default
        const stillValid = prev.filter(id => itemIds.includes(id));
        const brandNew = itemIds.filter((id: any) => !prev.includes(id));
        return [...stillValid, ...brandNew];
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Merge Guest Cart when user signs in
  useEffect(() => {
    const handleLoginMerge = async () => {
      if (user && !prevUser.current) {
        const guestItems = getGuestCart();
        if (guestItems.length > 0) {
          setIsLoading(true);
          const formattedItems = guestItems.map((item: CartItem) => ({
            productId: item.product_id,
            variantId: item.variant_id,
            quantity: item.quantity
          }));

          await mergeCart(formattedItems);
          localStorage.removeItem('rootloom_guest_cart');
          toast.success('Your items from guest cart have been added!');
          await fetchCart();
        }
      }
      prevUser.current = user;
    };

    if (!authLoading) {
      handleLoginMerge();
      fetchCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const addToCart = async (arg1: any, arg2?: string, arg3?: number) => {
    let productId: string;
    let variantId: string;
    let quantity: number;
    let productData: any;
    let variantData: any;

    if (typeof arg1 === 'object' && !Array.isArray(arg1)) {
      // New object-based signature
      ({ productId, variantId, quantity, productData, variantData } = arg1);
    } else {
      // Legacy positional signature: addToCart(productId, variantId, quantity)
      productId = arg1;
      variantId = arg2 as string;
      quantity = arg3 || 1;
    }

    console.log('[CartProvider] addToCart:', { productId, variantId, quantity });

    if (!user) {
      // Guest Logic
      const guestCart = getGuestCart();
      const existing = guestCart.find((i: any) => i.variant_id === variantId);

      let updatedCart;
      if (existing) {
        updatedCart = guestCart.map((i: any) =>
          i.variant_id === variantId ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        // We need some preview data for the UI if it's a new guest item
        const newItem = {
          id: Math.random().toString(36).substr(2, 9),
          product_id: productId,
          variant_id: variantId,
          quantity,
          product: productData,
          variant: variantData
        };
        updatedCart = [...guestCart, newItem];
        setLastAddedItem(newItem as any);
        // Select new item by default
        setSelectedItemIds(prev => [...prev, newItem.id]);
      }

      saveGuestCart(updatedCart);
      setCart(updatedCart);
      setIsMiniCartOpen(true);
      toast.success('Added to your bag!');
      return;
    }

    try {
      const result = await addToCartAction(productId, variantId, quantity);
      if (!result.success) throw new Error(result.message);

      await fetchCart();
      const newCartData = await getCart();
      const added = (newCartData as any[]).find((i) => i.product_id === productId && i.variant_id === variantId);
      if (added) {
        setLastAddedItem(added);
        // Selection is handled in fetchCart for new items
      }

      setIsMiniCartOpen(true);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error(error.message || 'Failed to add to cart');
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    if (!user) {
      const guestCart = getGuestCart();
      const updated = guestCart.map((i: any) =>
        i.id === itemId ? { ...i, quantity } : i
      );
      saveGuestCart(updated);
      setCart(updated);
      return;
    }

    try {
      const result = await updateCartItemAction(itemId, quantity);
      if (!result.success) throw new Error(result.message);

      await fetchCart();
    } catch (error: any) {
      console.error('Error updating cart:', error);
      toast.error(error.message || 'Failed to update cart');
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!user) {
      const guestCart = getGuestCart();
      const updated = guestCart.filter((i: any) => i.id !== itemId);
      saveGuestCart(updated);
      setCart(updated);
      setSelectedItemIds(prev => prev.filter(id => id !== itemId));
      return;
    }

    try {
      const result = await removeFromCartAction(itemId);
      if (!result.success) throw new Error(result.message);

      setSelectedItemIds(prev => prev.filter(id => id !== itemId));
      await fetchCart();
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      toast.error(error.message || 'Failed to remove from cart');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId) 
        : [...prev, itemId]
    );
  };

  const toggleAllSelection = () => {
    const allIds = cart.map(item => item.id);
    if (selectedItemIds.length === allIds.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allIds);
    }
  };

  const clearCart = async () => {
    if (!user) {
      saveGuestCart([]);
      setCart([]);
      setSelectedItemIds([]);
      return;
    }

    try {
      const result = await clearCartAction();
      if (!result.success) throw new Error(result.message);

      setSelectedItemIds([]);
      await fetchCart();
    } catch (error: any) {
      console.error('Error clearing cart:', error);
    }
  };

  const refreshCart = async () => {
    await fetchCart();
  };

  // Derived Values
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const selectedCartItems = cart.filter(item => selectedItemIds.includes(item.id));
  const selectedCartCount = selectedCartItems.length;
  const selectedCartQuantity = selectedCartItems.reduce((total, item) => total + item.quantity, 0);
  
  const getProductPrice = (product: any, variant: any) => {
    const base = product.base_price || 0;
    const adjustment = variant?.price_adjustment || 0;
    return base + adjustment;
  };

  const selectedCartTotal = selectedCartItems.reduce((total, item) => {
    const price = getProductPrice(item.product, item.variant);
    return total + price * item.quantity;
  }, 0);

  const isAllSelected = cart.length > 0 && selectedItemIds.length === cart.length;
  const isIndeterminate = selectedItemIds.length > 0 && selectedItemIds.length < cart.length;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        selectedItemIds,
        isLoading,
        addToCart,
        updateCartItem,
        removeFromCart,
        toggleItemSelection,
        toggleAllSelection,
        clearCart,
        refreshCart,
        isCartOpen,
        setIsCartOpen,
        selectedCartItems,
        selectedCartCount,
        selectedCartTotal,
        isAllSelected,
        isIndeterminate,
      }}
    >
      {children}
      <MiniCartPreview
        isOpen={isMiniCartOpen}
        onClose={() => setIsMiniCartOpen(false)}
        item={lastAddedItem}
      />
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

