'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/ui/fade-in';

export default function BrandStory() {
    return (
        <section className="py-24 bg-stone-50 overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Image Side */}
                    <FadeIn direction="right" className="relative order-2 lg:order-1 h-[500px] lg:h-[600px] w-full">
                        <div className="absolute inset-4 border border-slate-200 z-10 rounded-sm translate-x-4 translate-y-4" />
                        <div className="relative h-full w-full overflow-hidden rounded-sm bg-stone-200 shadow-xl">
                            <Image
                                src="/images/hero/street_vibes.png"
                                alt="Modern Streetwear"
                                fill
                                className="object-cover hover:scale-110 transition-transform duration-1000 grayscale hover:grayscale-0"
                            />
                        </div>
                    </FadeIn>

                    {/* Text Side */}
                    <FadeIn direction="left" className="order-1 lg:order-2">
                        <span className="text-xs font-bold tracking-[0.2em] text-[#ff00ff] uppercase mb-3 block">Streetwear Essentials</span>
                        <h2 className="text-4xl md:text-5xl font-black text-black mb-6 leading-tight uppercase italic">
                            Style That Speaks <br /> Louder Than Words
                        </h2>
                        <div className="h-2 w-24 bg-black mb-8" />

                        <div className="space-y-6 text-stone-700 font-medium leading-relaxed text-lg">
                            <p>
                                Welcome to Root&Loom—where urban energy meets premium drip. We&apos;re not just a brand; we&apos;re a movement for those who define their own rules and set the trends others follow.
                            </p>
                            <p>
                                Our collections are crafted for the bold, the expressive, and the unapologetic. From oversized silhouettes to experimental textures, we bring you the ultimate vibe for your everyday hustle. Join the clique and let your fit do the talking.
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
