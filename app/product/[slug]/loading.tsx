import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="aspect-square rounded-md" />
                        <Skeleton className="aspect-square rounded-md" />
                        <Skeleton className="aspect-square rounded-md" />
                    </div>
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-10 w-3/4" />
                    <Skeleton className="h-6 w-1/4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        </div>
    );
}
