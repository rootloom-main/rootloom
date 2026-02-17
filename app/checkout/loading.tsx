export default function CheckoutLoading() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-8" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="space-y-4">
                        <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                        <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                        <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg h-96 animate-pulse">
                    <div className="h-6 w-1/2 bg-gray-200 rounded mb-6" />
                    <div className="space-y-4">
                        <div className="h-4 w-full bg-gray-200 rounded" />
                        <div className="h-4 w-full bg-gray-200 rounded" />
                        <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}
