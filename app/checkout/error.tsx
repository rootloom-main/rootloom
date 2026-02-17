'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Checkout Error
            </h2>
            <p className="text-gray-600 mb-8 max-w-md">
                There was a problem loading the checkout. This might be due to a network issue.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={() => reset()}
                    className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                    Retry Checkout
                </button>
                <Link
                    href="/cart"
                    className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                    Back to Cart
                </Link>
            </div>
        </div>
    );
}
