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

// Brand Palette based on globals.css
// Deep Forest: #1e2f23 (text-deep-forest)
// Heirloom White: #f9f5ed (bg-heirloom-white)
// Raw Clay: #8c5a45 (text-raw-clay)
// Stone Paper: #f2efe9
// Woven Sand: #dcd6cb

const slides = [
    {
        id: 1,
        theme: 'new-arrivals',
        bgColor: 'bg-[#1e2f23]', // Deep Forest
        textColor: 'text-[#f9f5ed]', // Heirloom White
        badge: 'NEW COLLECTION',
        title: 'The Forest Edition',
        description: 'Inspired by nature. Crafted for the modern man. Experience the deep tones of our latest arrival.',
        image: 'https://images.pexels.com/photos/2897531/pexels-photo-2897531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Moody/Green vibes
        imageAlt: 'Man in forest green outfit',
        cta: 'Discover Now',
        ctaColor: 'bg-[#f9f5ed] text-[#1e2f23] hover:bg-[#dcd6cb]', // White btn on dark bg
    },
    {
        id: 2,
        theme: 'linen',
        bgColor: 'bg-[#f9f5ed]', // Heirloom White
        textColor: 'text-[#8c5a45]', // Raw Clay
        badge: 'PURE LINEN',
        title: 'Breathe Easy',
        description: '100% organic linen essentials for the rising temperatures. effortless style meets comfort.',
        image: 'https://images.pexels.com/photos/5325885/pexels-photo-5325885.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Bright/Sand vibes
        imageAlt: 'Man in linen shirt',
        cta: 'Shop Linen',
        ctaColor: 'bg-[#8c5a45] text-[#f9f5ed] hover:bg-[#704837]', // Clay btn on light bg
    },
    {
        id: 3,
        theme: 'ethnic',
        bgColor: 'bg-[#f2efe9]', // Stone Paper
        textColor: 'text-[#1e2f23]', // Deep Forest
        badge: 'WEDDING EDIT',
        title: 'Royal Heritage',
        description: 'Timeless sherwanis and kurtas handcrafted for your most cherished moments.',
        image: 'https://images.pexels.com/photos/12730626/pexels-photo-12730626.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Traditional
        imageAlt: 'Man in ethnic wear',
        cta: 'View Ethnic',
        ctaColor: 'bg-[#1e2f23] text-[#f9f5ed] hover:bg-[#2a4030]', // Dark btn on neutral bg
    },
    {
        id: 4,
        theme: 'winter',
        bgColor: 'bg-[#4a4a4a]', // Slate Bark/Grey
        textColor: 'text-[#f9f5ed]', // Heirloom White
        badge: 'WINTER ESSENTIALS',
        title: 'Layered Luxury',
        description: 'Premium wool blends and structured jackets to keep you warm in style.',
        image: 'https://images.pexels.com/photos/837129/pexels-photo-837129.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Urban/Winter
        imageAlt: 'Man in winter coat',
        cta: 'Shop Winter',
        ctaColor: 'bg-[#f9f5ed] text-[#4a4a4a] hover:bg-[#dcd6cb]', // White btn on grey bg
    },
    {
        id: 5,
        theme: 'sale',
        bgColor: 'bg-[#8c5a45]', // Raw Clay (instead of red)
        textColor: 'text-[#f9f5ed]', // Heirloom White
        badge: 'FLAT 50% OFF',
        title: 'End of Season Sale',
        description: 'Your favorite premium styles are now available at exclusive prices.',
        image: 'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', // Happy/Shopping
        imageAlt: 'Man shopping',
        cta: 'Grab Offers',
        ctaColor: 'bg-[#f9f5ed] text-[#8c5a45] hover:bg-[#dcd6cb]', // White btn on clay bg
    }
];

export function HeroSection() {
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
                    {slides.map((slide) => (
                        <CarouselItem key={slide.id} className="pl-0 basis-full">
                            <div className={cn("relative w-full min-h-[85vh] flex items-center overflow-hidden transition-colors duration-1000", slide.bgColor)}>
                                <div className="container mx-auto px-4 h-full relative z-20">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full items-center py-20 lg:py-0">

                                        {/* Left Content (Text) */}
                                        <div className="col-span-1 lg:col-span-5 flex flex-col justify-center items-start pl-4 lg:pl-0 order-2 lg:order-1 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
                                            <div className={cn("inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-[0.2em] border border-current uppercase opacity-80 backdrop-blur-sm rounded-full", slide.textColor)}>
                                                {slide.badge}
                                            </div>
                                            <h2 className={cn("text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-medium mb-6 leading-[0.9] tracking-tight", slide.textColor)}>
                                                {slide.title}
                                            </h2>
                                            <p className={cn("text-lg md:text-xl mb-10 max-w-md font-light leading-relaxed opacity-90", slide.textColor)}>
                                                {slide.description}
                                            </p>

                                            <div className="flex flex-wrap gap-4 mb-12">
                                                <Button size="lg" className={cn("h-14 px-8 text-lg rounded-full shadow-xl transition-all hover:scale-105 hover:shadow-2xl", slide.ctaColor)} asChild>
                                                    <Link href="/shop">
                                                        {slide.cta}
                                                        <ArrowRight className="ml-2 h-5 w-5" />
                                                    </Link>
                                                </Button>
                                                <Button size="lg" variant="outline" className={cn("h-14 px-8 text-lg rounded-full border-2 hover:scale-105 transition-all bg-transparent backdrop-blur-sm", slide.textColor)} asChild>
                                                    <Link href="/shop">
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
                                                    30-Day Returns
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                    Premium Quality
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Content (Image) */}
                                        <div className="col-span-1 lg:col-span-7 relative w-full h-[50vh] lg:h-full order-1 lg:order-2 lg:ml-[-10%]">
                                            {/* Gradient Overlay for integration */}
                                            <div className={cn("absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent via-transparent to-transparent z-10 pointer-events-none")} />

                                            <Image
                                                src={slide.image}
                                                alt={slide.imageAlt}
                                                fill
                                                className="object-cover object-top lg:object-center shadow-2xl lg:shadow-none"
                                                priority={slide.id === 1}
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
                {slides.map((_, index) => (
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
