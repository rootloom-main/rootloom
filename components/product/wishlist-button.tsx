'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleWishlist } from '@/lib/actions/wishlist';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface WishlistButtonProps {
    productId: string;
    isWishlisted?: boolean;
    className?: string;
    variant?: 'icon' | 'full';
}

export function WishlistButton({ productId, isWishlisted = false, className, variant = 'icon' }: WishlistButtonProps) {
    const [isActive, setIsActive] = useState(isWishlisted);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent linking if inside a Link card
        e.stopPropagation();

        // Optimistic update
        const newState = !isActive;
        setIsActive(newState);

        startTransition(async () => {
            const result = await toggleWishlist(productId);
            if (!result.success) {
                // Revert on failure
                setIsActive(!newState);
                toast.error(result.message);
                if (result.message.includes('login')) {
                    router.push('/auth/login');
                }
            } else {
                toast.success(result.message);
            }
        });
    };

    if (variant === 'full') {
        return (
            <Button
                variant="outline"
                className={cn("w-full gap-2", isActive && "text-red-500 border-red-200 bg-red-50", className)}
                onClick={handleToggle}
                disabled={isPending}
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
            disabled={isPending}
        >
            <Heart className={cn("h-5 w-5", isActive && "fill-current")} />
            <span className="sr-only">Wishlist</span>
        </Button>
    );
}
