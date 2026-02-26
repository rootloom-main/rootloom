'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/ui/fade-in';

export function BrandStory() {
    return (
        <section className="py-24 bg-stone-50 overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Image Side */}
                    <FadeIn direction="right" className="relative order-2 lg:order-1 h-[500px] lg:h-[600px] w-full">
                        <div className="absolute inset-4 border border-slate-200 z-10 rounded-sm translate-x-4 translate-y-4" />
                        <div className="relative h-full w-full overflow-hidden rounded-sm bg-stone-200 shadow-xl">
                            <Image
                                src="https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                alt="Artisan crafting fabric"
                                fill
                                className="object-cover hover:scale-105 transition-transform duration-1000"
                            />
                        </div>
                    </FadeIn>

                    {/* Text Side */}
                    <FadeIn direction="left" className="order-1 lg:order-2">
                        <span className="text-xs font-bold tracking-[0.2em] text-raw-clay uppercase mb-3 block">Our Heritage</span>
                        <h2 className="text-4xl md:text-5xl font-serif text-deep-forest mb-6 leading-tight">
                            Weaving Stories <br /> Into Every Thread
                        </h2>
                        <div className="h-1 w-20 bg-raw-clay mb-8" />

                        <div className="space-y-6 text-slate-600 font-light leading-relaxed text-lg">
                            <p>
                                At Root&Loom, we believe that true luxury lies in the details. Born from a passion for authentic craftsmanship, we bridge the gap between traditional artistry and modern aesthetics.
                            </p>
                            <p>
                                Every piece in our collection is a testament to the skill of master artisans who have perfected their craft over generations. We source only the finest organic fibers, ensuring that your style statement is also a conscious choice for the planet.
                            </p>
                        </div>

                        <div className="mt-10">
                            <Button variant="outline" className="border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-heirloom-white h-12 px-8 rounded-full uppercase text-xs tracking-widest transition-all group" asChild>
                                <Link href="/about">
                                    Read Our Story
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                        </div>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
}
