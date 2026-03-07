'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ProductSkeleton() {
    return (
        <div className="group relative bg-white border border-stone-200 rounded-lg overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
            {/* Image Area */}
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                <Skeleton className="h-full w-full rounded-none" />
            </div>

            {/* Content Area */}
            <div className="p-4 flex flex-col flex-1 gap-1.5">
                {/* Title */}
                <Skeleton className="h-4 w-3/4 rounded-sm mt-1" />
                <Skeleton className="h-4 w-1/2 rounded-sm" />

                {/* Rating */}
                <div className="flex items-center gap-1 mt-1">
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="w-3 h-3 rounded-full" />
                        ))}
                    </div>
                    <Skeleton className="w-8 h-3 rounded-full ml-1" />
                </div>

                {/* Price Area */}
                <div className="mt-auto flex items-baseline gap-2 pt-2">
                    <Skeleton className="h-6 w-20 rounded-sm" />
                    <Skeleton className="h-4 w-12 rounded-sm" />
                </div>

                {/* Mobile Buttons (matches ProductCard mobile layout) */}
                <div className="md:hidden mt-3 gap-2 flex">
                    <Skeleton className="h-9 w-10 rounded-sm" />
                    <Skeleton className="h-9 flex-1 rounded-sm" />
                </div>
            </div>
        </div>
    );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(count)].map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    );
}
