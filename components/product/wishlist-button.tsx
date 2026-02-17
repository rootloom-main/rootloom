'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/components/providers/wishlist-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface WishlistButtonProps {
    productId: string;
    isWishlisted?: boolean;
    className?: string;
    variant?: 'icon' | 'full';
}

export function WishlistButton({ productId, isWishlisted: initialIsWishlisted = false, className, variant = 'icon' }: WishlistButtonProps) {
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const isWishlisted = isInWishlist(productId); // Source of truth from provider
    const [isActive, setIsActive] = useState(initialIsWishlisted);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Sync with provider state
    useEffect(() => {
        setIsActive(isWishlisted);
    }, [isWishlisted]);

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isLoading) return;
        setIsLoading(true);

        try {
            if (!isActive) {
                await addToWishlist(productId);
                setIsActive(true);
            } else {
                await removeFromWishlist(productId);
                setIsActive(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (variant === 'full') {
        return (
            <Button
                variant="outline"
                className={cn("w-full gap-2", isActive && "text-red-500 border-red-200 bg-red-50", className)}
                onClick={handleToggle}
                disabled={isLoading}
            >
                <Heart className={cn("h-4 w-4", isActive && "fill-current")} />
                {isActive ? 'Saved to Wishlist' : 'Add to Wishlist'}
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "rounded-full hover:bg-neutral-100",
                isActive && "text-red-500 hover:text-red-600 hover:bg-red-50",
                className
            )}
            onClick={handleToggle}
            disabled={isLoading}
        >
            <Heart className={cn("h-5 w-5", isActive && "fill-current")} />
            <span className="sr-only">Wishlist</span>
        </Button>
    );
}
