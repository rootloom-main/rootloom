export default function CartLoading() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mb-8" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex gap-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                            <div className="h-24 w-24 bg-gray-200 rounded" />
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-3/4 bg-gray-200 rounded" />
                                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                                <div className="h-8 w-24 bg-gray-200 rounded mt-4" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-64 bg-gray-50 rounded-lg animate-pulse p-6">
                    <div className="space-y-4">
                        <div className="h-6 w-full bg-gray-200 rounded" />
                        <div className="h-4 w-full bg-gray-200 rounded" />
                        <div className="h-12 w-full bg-gray-300 rounded mt-6" />
                    </div>
                </div>
            </div>
        </div>
    );
}
