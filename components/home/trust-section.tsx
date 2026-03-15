'use client';

import { Truck, RefreshCw, Shield, Star } from 'lucide-react';

const features = [
    {
        icon: Truck,
        title: 'Fast Shipping',
        description: 'Orders over ₹999',
    },
    {
        icon: RefreshCw,
        title: 'No-Stress Returns',
        description: '30-Day Window',
    },
    {
        icon: Shield,
        title: 'Secure Check',
        description: '100% Encrypted',
    },
    {
        icon: Star,
        title: 'Drip Guaranteed',
        description: 'Curated 4 U',
    },
];

export default function TrustSection() {
    return (
        <section className="py-16 bg-[#f9f8f6] border-b border-stone-200">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="text-center group">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4 text-[#8c5a45] group-hover:bg-[#8c5a45] group-hover:text-white transition-colors duration-300">
                                <feature.icon className="h-7 w-7" />
                            </div>
                            <h3 className="font-serif font-medium text-lg mb-1 text-slate-900">{feature.title}</h3>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
