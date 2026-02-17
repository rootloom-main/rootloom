'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h2 className="text-xl font-semibold mb-4">Failed to load products</h2>
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
            >
                Try again
            </button>
        </div>
    );
}
