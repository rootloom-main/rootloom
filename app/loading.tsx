export default function Loading() {
    return (
        <div className="min-h-screen bg-stone-50">
            {/* Skeleton Header */}
            <div className="h-20 bg-white border-b border-stone-200" />

            {/* Skeleton Hero/Content */}
            <div className="container mx-auto px-4 py-8 animate-pulse">
                <div className="h-64 md:h-96 bg-stone-200 rounded-lg mb-8" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="h-80 bg-stone-200 rounded-lg" />
                    <div className="h-80 bg-stone-200 rounded-lg" />
                    <div className="h-80 bg-stone-200 rounded-lg" />
                </div>
            </div>
        </div>
    );
}
