'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface WishlistItem {
    id: string;
    product_id: string;
}

interface WishlistContextType {
    wishlist: WishlistItem[];
    wishlistCount: number;
    isLoading: boolean;
    isInWishlist: (productId: string) => boolean;
    addToWishlist: (productId: string) => Promise<void>;
    removeFromWishlist: (productId: string) => Promise<void>;
    refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    const fetchWishlist = async () => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setWishlist([]);
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('wishlists')
                .select('id, product_id')
                .eq('user_id', user.id);

            if (error) throw error;
            setWishlist(data || []);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            fetchWishlist();
        });

        return () => subscription.unsubscribe();
    }, []);

    const isInWishlist = (productId: string) => {
        return wishlist.some((item) => item.product_id === productId);
    };

    const addToWishlist = async (productId: string) => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                toast.error('Please login to use wishlist');
                return;
            }

            // Optimistic update
            const tempId = Math.random().toString();
            setWishlist((prev) => [...prev, { id: tempId, product_id: productId }]);

            const { data, error } = await supabase
                .from('wishlists')
                .insert({
                    user_id: user.id,
                    product_id: productId,
                })
                .select()
                .single();

            if (error) {
                // Revert on error
                setWishlist((prev) => prev.filter((item) => item.id !== tempId));
                throw error;
            }

            // Update with real ID
            setWishlist((prev) =>
                prev.map(item => item.id === tempId ? { ...item, id: data.id } : item)
            );

            toast.success('Added to wishlist');
        } catch (error) {
            console.error('Error adding to wishlist:', error);
            toast.error('Failed to add to wishlist');
        }
    };

    const removeFromWishlist = async (productId: string) => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            // Optimistic update
            const itemToRemove = wishlist.find(item => item.product_id === productId);
            if (!itemToRemove) return;

            setWishlist((prev) => prev.filter((item) => item.product_id !== productId));

            // We need the ID to delete efficiently, but if we only have product_Id, we can query or delete by unique constraint
            // Assuming unique(user_id, product_id)
            const { error } = await supabase
                .from('wishlists')
                .delete()
                .match({ user_id: user.id, product_id: productId });

            if (error) {
                setWishlist((prev) => [...prev, itemToRemove]); // Revert
                throw error;
            }

            toast.success('Removed from wishlist');
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            toast.error('Failed to remove from wishlist');
        }
    };

    const refreshWishlist = async () => {
        await fetchWishlist();
    };

    return (
        <WishlistContext.Provider
            value={{
                wishlist,
                wishlistCount: wishlist.length,
                isLoading,
                isInWishlist,
                addToWishlist,
                removeFromWishlist,
                refreshWishlist,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
