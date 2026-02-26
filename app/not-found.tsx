import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <FileQuestion className="h-10 w-10 text-slate-400" />
            </div>
            <h1 className="text-4xl font-playfair font-bold text-deep-forest mb-4">Page Not Found</h1>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
            </p>
            <div className="flex gap-4">
                <Button asChild variant="default" className="bg-deep-forest hover:bg-deep-forest/90">
                    <Link href="/">Back to Home</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/shop">Browse Shop</Link>
                </Button>
            </div>
        </div>
    );
}
