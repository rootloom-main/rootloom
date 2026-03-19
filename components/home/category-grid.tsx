'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { FadeIn, FadeInStagger, fadeInItemVariants } from '@/components/ui/fade-in';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Category {
    id: string;
    name: string;
    slug: string;
    image_url: string | null;
}

interface CategoryGridProps {
    categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
    return (
        <section className="py-12 md:py-20 bg-stone-50/50">
            <div className="container mx-auto px-6">
                <FadeIn>
                    <div className="text-center mb-10 md:mb-12">
                        <span className="text-[10px] font-bold tracking-[0.4em] text-slate-400 uppercase mb-2 block">
                            Collections
                        </span>
                        <h2 className="text-3xl md:text-4xl font-serif text-deep-forest mb-4">
                            Shop by Category
                        </h2>
                        <div className="w-12 h-0.5 bg-raw-clay/30 mx-auto rounded-full"></div>
                    </div>
                </FadeIn>

                <FadeInStagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                    {categories?.map((category) => (
                        <motion.div
                            key={category.id}
                            variants={fadeInItemVariants}
                            whileHover={{ y: -8 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <Link
                                href={`/shop?category=${category.slug}`}
                                className="group block relative overflow-hidden rounded-[2rem] bg-white ring-1 ring-black/[0.03] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500"
                            >
                                <div className="relative aspect-[3/4] overflow-hidden">
                                    <Image
                                        src={category.image_url || '/placeholder-category.jpg'}
                                        alt={category.name}
                                        fill
                                        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                    />

                                    {/* Subtle vignette for depth */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    {/* Floating Glassmorphic Label */}
                                    <div className="absolute inset-x-4 bottom-4">
                                        <div className="backdrop-blur-md bg-white/70 border border-white/40 p-3 md:p-4 rounded-2xl shadow-sm transform transition-all duration-500 group-hover:bg-white/90">
                                            <h3 className="text-base md:text-lg font-serif text-deep-forest text-center leading-tight">
                                                {category.name}
                                            </h3>
                                            <div className="flex items-center justify-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                                <span className="text-[8px] font-bold tracking-widest uppercase text-raw-clay">View</span>
                                                <ArrowRight className="h-2 w-2 text-raw-clay" />
                                            </div>
                                        </div>
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
