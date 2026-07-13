'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-deep-forest mb-2">Something went wrong!</h2>
            <p className="text-slate-500 mb-8 max-w-md">
                We apologize for the inconvenience. An unexpected error has occurred.
            </p>
            <div className="flex gap-4">
                <Button onClick={() => reset()} variant="outline">
                    Try again
                </Button>
                <Button onClick={() => window.location.href = '/'} className="bg-deep-forest hover:bg-deep-forest/90">
                    Go Home
                </Button>
            </div>
        </div>
    );
}
