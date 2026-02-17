export default function OrdersLoading() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-8" />

            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg overflow-hidden border-gray-200 animate-pulse">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-200 rounded" />
                                <div className="h-3 w-24 bg-gray-200 rounded" />
                            </div>
                            <div className="h-6 w-20 bg-gray-200 rounded" />
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex gap-4">
                                <div className="h-20 w-20 bg-gray-200 rounded" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                                    <div className="h-3 w-1/2 bg-gray-200 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
