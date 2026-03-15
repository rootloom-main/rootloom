'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';
import { ArrowRight } from 'lucide-react';

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const THEME_CONFIGS: Record<string, any> = {
    'streetwear': {
        bgColor: 'bg-black',
        textColor: 'text-white',
        ctaColor: 'bg-[#ff00ff] text-white hover:bg-[#d400d4] shadow-[0_0_20px_rgba(255,0,255,0.5)]'
    },
    'cyber': {
        bgColor: 'bg-[#0a0a0a]',
        textColor: 'text-white',
        ctaColor: 'bg-[#00ffff] text-black hover:bg-[#00d4d4] shadow-[0_0_20px_rgba(0,255,255,0.5)]'
    },
    'neon': {
        bgColor: 'bg-[#1a0033]',
        textColor: 'text-[#f0f0f0]',
        ctaColor: 'bg-[#39ff14] text-black hover:bg-[#32e612] shadow-[0_0_20px_rgba(57,255,20,0.5)]'
    },
    'minimal-urban': {
        bgColor: 'bg-white',
        textColor: 'text-black',
        ctaColor: 'bg-black text-white hover:bg-stone-800'
    },
    'electric': {
        bgColor: 'bg-[#0012ff]',
        textColor: 'text-white',
        ctaColor: 'bg-[#ffff00] text-black hover:bg-[#e6e600] shadow-[0_0_20px_rgba(255,255,0,0.5)]'
    },
    'sunset': {
        bgColor: 'bg-gradient-to-br from-[#ff4e50] to-[#f9d423]',
        textColor: 'text-white',
        ctaColor: 'bg-black text-white hover:bg-stone-900'
    },
    'graffiti': {
        bgColor: 'bg-[#2a2a2a]',
        textColor: 'text-[#39ff14]',
        ctaColor: 'bg-[#ff00ff] text-white hover:bg-[#d400d4] shadow-[0_0_20px_rgba(255,0,255,0.5)]'
    },
    'default': {
        bgColor: 'bg-black',
        textColor: 'text-white',
        ctaColor: 'bg-white text-black hover:bg-stone-200'
    }
};

export function HeroSection({ heroBanners = [] }: { heroBanners?: any[] }) {
    const displaySlides = heroBanners.map((banner, index) => {
        const metadata = banner.metadata || {};
        const theme = metadata.theme || 'default';
        const config = THEME_CONFIGS[theme] || THEME_CONFIGS['default'];

        return {
            id: banner.id,
            theme: theme,
            bgColor: metadata.bgColor || config.bgColor,
            textColor: metadata.textColor || config.textColor,
            badge: metadata.badge || 'DROP 01 // LIMITED',
            title: banner.title,
            description: banner.description || '',
            image: banner.image_url,
            imageAlt: banner.title,
            cta: metadata.cta || 'GET THE DRIP',
            ctaColor: metadata.ctaColor || config.ctaColor,
            link: banner.collections?.slug 
                ? `/collections/${banner.collections.slug}` 
                : (banner.link || '/shop')
        };
    });

    const plugin = React.useRef(
        Autoplay({ delay: 5000, stopOnInteraction: false }) as any
    );

    const [api, setApi] = React.useState<CarouselApi>();
    const [current, setCurrent] = React.useState(0);

    React.useEffect(() => {
        if (!api) {
            return;
        }

        setCurrent(api.selectedScrollSnap());

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap());
        });
    }, [api]);

    // Fallback static hero when no banners are configured in the database
    if (displaySlides.length === 0) {
        return (
            <section className="relative w-full overflow-hidden bg-[#1e2f23] min-h-[85vh] flex items-center">
                <div className="container mx-auto px-4 relative z-20 py-20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="flex flex-col justify-center items-start">
                            <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] border border-current text-[#f9f5ed] uppercase opacity-80 backdrop-blur-sm rounded-full">
                                NEW COLLECTION
                            </div>
                            <h2 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 leading-[0.85] tracking-tighter uppercase italic drop-shadow-2xl text-[#f9f5ed]">
                                Root &amp; Loom
                            </h2>
                            <p className="text-lg md:text-xl mb-10 max-w-md font-light leading-relaxed opacity-90 text-[#f9f5ed]">
                                Inspired by nature. Crafted for the modern world. Explore our latest sustainable fashion collection.
                            </p>
                            <div className="flex flex-wrap gap-4 mb-12">
                                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl bg-[#f9f5ed] text-[#1e2f23] hover:bg-[#dcd6cb]" asChild>
                                    <Link href="/shop">
                                        Shop Now
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:scale-105 transition-all bg-transparent backdrop-blur-sm text-[#f9f5ed] hidden sm:inline-flex" asChild>
                                    <Link href="/shop">View Collection</Link>
                                </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-6 text-xs md:text-sm font-medium opacity-80 border-t border-current/20 pt-6 w-full text-[#f9f5ed]">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-current" />Free Shipping</div>
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-current" />7-Day Easy Returns</div>
                                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-current" />Premium Quality</div>
                            </div>
                        </div>
                        <div className="relative w-full h-[50vh] lg:h-[70vh]">
                            <Image
                                src="/hero.png"
                                alt="Root & Loom Collection"
                                fill
                                className="object-cover object-top lg:object-center shadow-2xl lg:shadow-none"
                                priority
                                sizes="(max-width: 1024px) 100vw, 60vw"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative w-full overflow-hidden bg-background">
            <Carousel
                plugins={[plugin.current]}
                className="w-full"
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
                setApi={setApi}
                opts={{
                    loop: true,
                }}
            >
                <CarouselContent className="-ml-0">
                    {displaySlides.map((slide, index) => (
                        <CarouselItem key={slide.id} className="pl-0 basis-full">
                            <div className={cn("relative w-full min-h-[85vh] flex items-center overflow-hidden transition-colors duration-1000", slide.bgColor)}>
                                <div className="container mx-auto px-4 h-full relative z-20">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-12 h-full items-center py-20 lg:py-0">

                                        {/* Left Content (Text) */}
                                        <div className="flex flex-col justify-center items-start pl-4 lg:pl-0 order-2 lg:order-1 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both z-30">
                                            <div className={cn("inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] border border-current uppercase opacity-80 backdrop-blur-sm rounded-full", slide.textColor)}>
                                                {slide.badge}
                                            </div>
                                            <h2 className={cn("text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 leading-[0.85] tracking-tighter uppercase italic drop-shadow-2xl", slide.textColor)}>
                                                {slide.title}
                                            </h2>
                                            <p className={cn("text-lg md:text-xl mb-10 max-w-md font-light leading-relaxed opacity-90", slide.textColor)}>
                                                {slide.description}
                                            </p>

                                            <div className="flex flex-wrap gap-4 mb-12">
                                                <Button size="lg" className={cn("h-14 px-8 text-lg rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl", slide.ctaColor)} asChild>
                                                    <Link href={slide.link || '/shop'}>
                                                        {slide.cta}
                                                        <ArrowRight className="ml-2 h-5 w-5" />
                                                    </Link>
                                                </Button>
                                                <Button size="lg" variant="outline" className={cn("h-14 px-8 text-lg rounded-full border-2 hover:scale-105 transition-all bg-transparent backdrop-blur-sm hidden sm:inline-flex", slide.textColor)} asChild>
                                                    <Link href={slide.link || '/shop'}>
                                                        View Collection
                                                    </Link>
                                                </Button>
                                            </div>

                                            {/* Trust Indicators */}
                                            <div className={cn("flex flex-wrap items-center gap-6 text-xs md:text-sm font-medium opacity-80 border-t border-current/20 pt-6 w-full", slide.textColor)}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    Free Shipping
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    7-Day Easy Returns
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    Premium Quality
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Content (Image) */}
                                        <div className="relative w-full h-[50vh] lg:h-[70vh] order-1 lg:order-2">
                                            {/* Gradient Overlay for integration */}
                                            <div className={cn("absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent via-transparent to-transparent z-10 pointer-events-none")} />

                                            <Image
                                                src={slide.image}
                                                alt={slide.imageAlt}
                                                fill
                                                className="object-cover object-top lg:object-center shadow-2xl lg:shadow-none"
                                                priority={index === 0}
                                                sizes="(max-width: 1024px) 100vw, 60vw"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            {/* Indicators */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                {displaySlides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => api?.scrollTo(index)}
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            current === index
                                ? "w-8 bg-white opacity-100"
                                : "w-2 bg-white/50 hover:bg-white/75"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
