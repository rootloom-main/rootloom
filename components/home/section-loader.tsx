import React from 'react';

export default function SectionLoader() {
    return (
        <div className="py-12 md:py-20 animate-pulse">
            <div className="container mx-auto px-6">
                <div className="h-4 w-24 bg-stone-200 rounded mb-4" />
                <div className="h-8 w-64 bg-stone-200 rounded mb-12" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-4">
                            <div className="aspect-[3/4] bg-stone-200 rounded-xl" />
                            <div className="h-4 w-3/4 bg-stone-200 rounded" />
                            <div className="h-4 w-1/4 bg-stone-200 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
