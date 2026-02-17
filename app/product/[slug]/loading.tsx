import { Skeleton } from '@/components/ui/skeleton';

export default function ProductLoading() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                {/* Image Gallery Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="aspect-square rounded-md" />
                        ))}
                    </div>
                </div>

                {/* Product Info Skeleton */}
                <div className="space-y-6">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-1/4" />

                    <Skeleton className="h-24 w-full" />

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <Skeleton className="h-6 w-32" />
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-16 rounded-full" />)}
                        </div>
                    </div>

                    <Skeleton className="h-12 w-full mt-8" />
                </div>
            </div>
        </div>
    );
}
