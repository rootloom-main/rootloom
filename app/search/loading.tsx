import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-40" />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Skeleton */}
                <div className="hidden lg:block w-64 flex-shrink-0 space-y-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-5 w-full" />
                        ))}
                    </div>
                    <Skeleton className="h-px w-full my-6" />
                    <Skeleton className="h-6 w-24 mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-8 w-16 inline-block mr-2" />
                        ))}
                    </div>
                </div>

                {/* Product Grid Skeleton */}
                <div className="flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="h-[300px] w-full rounded-sm" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
