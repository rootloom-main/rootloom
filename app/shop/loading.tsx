import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="h-10 w-64 mb-8 bg-gray-200 rounded animate-pulse" />
            <div className="grid md:grid-cols-4 gap-8">
                <div className="hidden md:block">
                    <div className="space-y-6">
                        <Skeleton className="h-8 w-32" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                </div>
                <div className="md:col-span-3">
                    <div className="flex justify-between mb-6">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-10 w-[180px]" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex flex-col space-y-3">
                                <Skeleton className="h-[300px] w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-[80%]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
