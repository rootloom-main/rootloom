'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 p-4">
                    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg border border-stone-200 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
                            Something went wrong!
                        </h2>

                        <p className="text-stone-600 mb-8">
                            We apologize for the inconvenience. A critical error occurred while loading the application.
                        </p>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={() => reset()}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Try again
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => window.location.href = '/'}
                                className="w-full"
                            >
                                Go to Homepage
                            </Button>
                        </div>

                        {error.digest && (
                            <p className="mt-8 text-xs text-stone-400 font-mono">
                                Error ID: {error.digest}
                            </p>
                        )}
                    </div>
                </div>
            </body>
        </html>
    );
}
