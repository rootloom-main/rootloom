'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { FadeIn, FadeInStagger, fadeInItemVariants } from '@/components/ui/fade-in';
import { motion } from 'framer-motion';

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
        <section className="py-24 bg-stone-50">
            <div className="container mx-auto px-6">
                <FadeIn>
                    <div className="text-center mb-16">
                        <span className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mb-3 block">Discover</span>
                        <h2 className="text-3xl md:text-5xl font-serif text-deep-forest mt-2 mb-6">Shop by Category</h2>
                        <div className="w-24 h-1 bg-raw-clay mx-auto rounded-full"></div>
                    </div>
                </FadeIn>

                <FadeInStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {categories?.map((category) => (
                        <motion.div
                            key={category.id}
                            variants={fadeInItemVariants}
                        >
                            <Link
                                href={`/shop?category=${category.slug}`}
                                className="group block relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-500"
                            >
                                <div className="relative aspect-[3/4] bg-stone-200 overflow-hidden">
                                    <Image
                                        src={category.image_url || '/placeholder-category.jpg'}
                                        alt={category.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />

                                    {/* Overlay Content */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-end p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity">
                                        <h3 className="text-2xl font-serif text-white mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                            {category.name}
                                        </h3>
                                        <div className="h-0.5 w-0 group-hover:w-12 bg-white transition-all duration-500 delay-100 mb-4" />
                                        <span className="text-white/90 text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-200 flex items-center gap-2">
                                            Explore Collection <ArrowRight className="h-3 w-3" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </FadeInStagger>
            </div>
        </section>
    );
}
