'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { getWishlist, toggleWishlist } from '@/lib/actions/wishlist';

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
    const { user, loading: authLoading } = useAuth();

    const fetchWishlist = async () => {
        if (!user) {
            const stored = localStorage.getItem('guestWishlist');
            if (stored) {
                try {
                    setWishlist(JSON.parse(stored));
                } catch { setWishlist([]); }
            } else {
                setWishlist([]);
            }
            setIsLoading(false);
            return;
        }

        try {
            let data = await getWishlist();

            // Sync guest wishlist on login
            const stored = localStorage.getItem('guestWishlist');
            if (stored) {
                try {
                    const localItems = JSON.parse(stored);
                    if (localItems.length > 0) {
                        for (const item of localItems) {
                            if (!data?.some((d: any) => d.product_id === item.product_id)) {
                                await toggleWishlist(item.product_id);
                            }
                        }
                        localStorage.removeItem('guestWishlist');
                        data = await getWishlist(); // Refresh after sync
                    }
                } catch (e) { }
            }

            setWishlist(data || []);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchWishlist();
        }
    }, [user, authLoading]);

    const isInWishlist = (productId: string) => {
        return wishlist.some((item) => item.product_id === productId);
    };

    const handleToggle = async (productId: string, optimisticAction: 'add' | 'remove') => {
        if (!user) {
            // Guest mode: save to local storage
            let newWishlist = [...wishlist];
            if (optimisticAction === 'add') {
                newWishlist.push({ id: Math.random().toString(), product_id: productId });
            } else {
                newWishlist = newWishlist.filter((item) => item.product_id !== productId);
            }
            setWishlist(newWishlist);
            localStorage.setItem('guestWishlist', JSON.stringify(newWishlist));
            toast.success(optimisticAction === 'add' ? 'Added to local wishlist' : 'Removed from local wishlist');
            return;
        }

        const tempId = Math.random().toString();

        // Optimistic Update
        if (optimisticAction === 'add') {
            setWishlist((prev) => [...prev, { id: tempId, product_id: productId }]);
        } else {
            setWishlist((prev) => prev.filter((item) => item.product_id !== productId));
        }

        try {
            const result = await toggleWishlist(productId);
            if (!result.success) {
                throw new Error(result.message);
            }

            await fetchWishlist();
            toast.success(result.message);

        } catch (error: any) {
            console.error('Wishlist toggle error:', error);
            if (optimisticAction === 'add') {
                setWishlist((prev) => prev.filter((item) => item.id !== tempId));
            } else {
                await fetchWishlist();
            }
            toast.error(error.message || 'Failed to update wishlist');
        }
    };

    const addToWishlist = async (productId: string) => {
        await handleToggle(productId, 'add');
    };

    const removeFromWishlist = async (productId: string) => {
        await handleToggle(productId, 'remove');
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
