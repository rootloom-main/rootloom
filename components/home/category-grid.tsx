'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
}

interface CategoryGridProps {
    categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
    return (
        <section className="py-20 bg-stone-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <span className="text-xs font-medium tracking-widest text-slate-500 uppercase">Discover</span>
                    <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mt-2">Shop by Category</h2>
                    <div className="w-24 h-1 bg-stone-300 mx-auto mt-6"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {categories?.map((category) => (
                        <Link
                            key={category.id}
                            href={`/shop?category=${category.slug}`}
                            className="group block"
                        >
                            <div className="relative overflow-hidden rounded-sm aspect-[4/5] bg-stone-200">
                                <Image
                                    src={category.image_url || '/placeholder-category.jpg'}
                                    alt={category.name}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />

                                {/* Overlay Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-end p-6 bg-gradient-to-t from-black/60 to-transparent opacity-90 group-hover:opacity-100 transition-opacity">
                                    <h3 className="text-xl font-serif text-white mb-1 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                        {category.name}
                                    </h3>
                                    <span className="text-white/80 text-xs tracking-wider uppercase opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75 flex items-center gap-2">
                                        Explore <ArrowRight className="h-3 w-3" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
