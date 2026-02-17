export default function ProductLoading() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                {/* Image Gallery Skeleton */}
                <div className="space-y-4">
                    <div className="aspect-square bg-gray-200 rounded-lg w-full" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-square bg-gray-200 rounded-md" />
                        ))}
                    </div>
                </div>

                {/* Product Info Skeleton */}
                <div className="space-y-6">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-10 w-3/4 bg-gray-200 rounded" />
                    <div className="h-6 w-1/4 bg-gray-200 rounded" />

                    <div className="h-24 w-full bg-gray-200 rounded" />

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="h-6 w-32 bg-gray-200 rounded" />
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-10 w-16 bg-gray-200 rounded-full" />)}
                        </div>
                    </div>

                    <div className="h-12 w-full bg-gray-200 rounded mt-8" />
                </div>
            </div>
        </div>
    );
}
