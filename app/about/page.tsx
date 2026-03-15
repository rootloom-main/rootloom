import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sparkles, Flame, Globe2, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Root & Loom | Premium GenZ Streetwear & Sustainable Drip',
    description: 'We are the future of streetwear. Root & Loom brings you sustainable, ethical, and unabashedly pure drip. No fast fashion, just real culture.',
    openGraph: {
        title: 'About Root & Loom | Premium GenZ Streetwear',
        description: 'Sustainable, ethical, and pure drip. Join the streetwear revolution.',
        images: ['https://images.pexels.com/photos/1933873/pexels-photo-1933873.jpeg'],
    }
};

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-[#fafafa] selection:bg-deep-forest selection:text-white overflow-hidden font-sans">
            {/* SEO Hidden H1 for Structure */}
            <h1 className="sr-only">About Root & Loom - Sustainable GenZ Streetwear</h1>
            
            {/* HERO SECTION - Brutalist / Y2K inspired */}
            <section className="relative min-h-[90vh] flex items-center justify-center border-b-[12px] border-deep-forest overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://images.pexels.com/photos/1933873/pexels-photo-1933873.jpeg?auto=compress&cs=tinysrgb&w=1600"
                        alt="Urban streetwear lifestyle"
                        fill
                        className="object-cover grayscale opacity-20 scale-105 animate-slow-zoom"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#fafafa] z-0"></div>
                </div>
                
                <div className="relative z-10 container mx-auto px-4 text-center mt-20">
                    <div className="inline-block bg-deep-forest text-white px-4 py-1.5 rounded-full font-bold text-xs md:text-sm uppercase tracking-widest mb-6 border-2 border-stone-200 shadow-[4px_4px_0px_#1A231D] transform -rotate-2">
                        Established 2024
                    </div>
                    <div className="text-6xl md:text-8xl lg:text-[10rem] font-black uppercase tracking-tighter text-deep-forest leading-none mb-6">
                        WE ARE <br className="hidden md:block"/> THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-deep-forest to-raw-clay">VIBE</span>
                    </div>
                    <h2 className="text-lg md:text-3xl font-bold text-stone-800 max-w-3xl mx-auto uppercase tracking-wide leading-relaxed">
                        Redefining streetwear for the next generation. Pure drip, zero compromises, 100% sustainable.
                    </h2>
                </div>
                
                {/* Scrolling Marquee inside Hero */}
                <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden bg-deep-forest text-heirloom-white border-y-[6px] border-raw-clay py-4 z-20 flex whitespace-nowrap">
                    <div className="animate-marquee inline-flex flex-nowrap items-center gap-10 font-black text-2xl md:text-3xl uppercase tracking-widest w-[200%]">
                        <span>SUSTAINABLE DRIP</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                        <span>STREETWEAR CULTURE</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                        <span>NO FAST FASHION BS</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                        <span>ROOT & LOOM</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                        <span>SUSTAINABLE DRIP</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                        <span>STREETWEAR CULTURE</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                        <span>NO FAST FASHION BS</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                        <span>ROOT & LOOM</span> <Sparkles className="inline w-8 h-8 text-raw-clay" />
                    </div>
                </div>
            </section>

            {/* THE MANIFESTO */}
            <section className="py-24 md:py-32 container mx-auto px-4 relative">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-24">
                    <div className="w-full md:w-1/2 relative group">
                        <div className="absolute inset-0 bg-raw-clay translate-x-4 translate-y-4 border-[3px] border-deep-forest rounded-[2rem] transition-transform group-hover:translate-x-6 group-hover:translate-y-6 duration-300"></div>
                        <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border-[3px] border-deep-forest z-10 bg-stone-100">
                            <Image
                                src="https://images.pexels.com/photos/2726111/pexels-photo-2726111.jpeg?auto=compress&cs=tinysrgb&w=1200"
                                alt="Edgy street fashion manifesto"
                                fill
                                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-105"
                            />
                        </div>
                    </div>
                    
                    <div className="w-full md:w-1/2 space-y-8">
                        <div className="flex items-center gap-3">
                            <Flame className="w-10 h-10 text-raw-clay" />
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-deep-forest">The Manifesto</h2>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold leading-relaxed text-stone-900 border-l-8 border-raw-clay pl-6">
                            We got tired of brands choosing aesthetics over ethics. So we built Root & Loom. 
                        </p>
                        <p className="text-lg md:text-xl text-stone-600 leading-relaxed font-medium">
                            Our garments aren&apos;t just pieces of cloth. They are a statement. Woven by master artisans across India, infused with modern street culture, and engineered to last. <br/><br/>
                            <span className="bg-deep-forest text-white px-2 py-1 font-bold">This is anti-fast-fashion.</span> You wear it, you own it, it defines your era.
                        </p>
                        
                        <div className="pt-6">
                            <Link href="/shop">
                                <Button size="lg" className="bg-deep-forest hover:bg-slate-900 text-white rounded-none font-black text-lg md:text-xl uppercase tracking-widest h-16 md:h-20 px-10 md:px-14 border-4 border-deep-forest shadow-[8px_8px_0px_#8B6A4F] hover:shadow-[4px_4px_0px_#8B6A4F] hover:translate-x-1 hover:translate-y-1 transition-all">
                                    Cop The Look
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* BENTO BOX GRID / VALUES */}
            <section className="py-24 bg-deep-forest text-white border-y-[12px] border-raw-clay">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16 md:mb-24">
                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-raw-clay to-heirloom-white">
                            How We Roll
                        </h2>
                        <h3 className="text-xl md:text-2xl text-stone-400 font-bold uppercase tracking-widest">The 3 Non-Negotiables</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {/* Box 1 */}
                        <div className="bg-[#1A231D] p-10 md:p-12 rounded-[2rem] border-2 border-stone-800 hover:border-raw-clay transition-all duration-300 group hover:-translate-y-2 shadow-2xl">
                            <Globe2 className="w-16 h-16 text-raw-clay mb-8 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                            <h4 className="text-3xl font-black uppercase mb-4 tracking-wide text-heirloom-white">Earth First</h4>
                            <p className="text-stone-300 font-medium leading-relaxed text-lg">
                                Regenerative cotton, non-toxic dyes, zero greenwashing. We only drop fits that respect the planet and leave no dirty footprint behind.
                            </p>
                        </div>
                        
                        {/* Box 2 */}
                        <div className="bg-[#1A231D] p-10 md:p-12 rounded-[2rem] border-2 border-stone-800 hover:border-woven-sand transition-all duration-300 group lg:-translate-y-6 shadow-2xl">
                            <Sparkles className="w-16 h-16 text-woven-sand mb-8 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                            <h4 className="text-3xl font-black uppercase mb-4 tracking-wide text-heirloom-white">Premium Drip</h4>
                            <p className="text-stone-300 font-medium leading-relaxed text-lg">
                                Oversized silhouettes, heavy GSM fabrics, and details that break necks. Unapologetically bold designs made for the boldest generation.
                            </p>
                        </div>

                        {/* Box 3 */}
                        <div className="bg-[#1A231D] p-10 md:p-12 rounded-[2rem] border-2 border-stone-800 hover:border-yellow-500 transition-all duration-300 group hover:-translate-y-2 shadow-2xl">
                            <ShieldCheck className="w-16 h-16 text-yellow-500 mb-8 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                            <h4 className="text-3xl font-black uppercase mb-4 tracking-wide text-heirloom-white">Fair Play</h4>
                            <p className="text-stone-300 font-medium leading-relaxed text-lg">
                                Our artisans get paid living wages in safe environments. We don&apos;t believe in exploitation. Period. We uplift everyone in our supply chain.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-32 md:py-48 container mx-auto px-4 text-center">
                <h2 className="text-6xl md:text-[8rem] font-black uppercase tracking-tighter text-deep-forest mb-12 leading-[0.9]">
                    Stop Wearing <br className="hidden md:block"/> Boring <span className="text-raw-clay line-through opacity-80 decoration-deep-forest">Sh*t.</span>
                </h2>
                <Link href="/shop" className="inline-block">
                    <Button size="lg" className="bg-raw-clay hover:bg-oxide-brown text-white rounded-full font-black text-2xl md:text-4xl uppercase tracking-widest h-24 md:h-32 px-12 md:px-20 border-8 border-deep-forest shadow-[12px_12px_0px_#1A231D] hover:shadow-[6px_6px_0px_#1A231D] hover:translate-x-2 hover:translate-y-2 transition-all group">
                        Upgrade Your Fit <ArrowRight className="ml-4 md:ml-8 w-10 h-10 md:w-16 md:h-16 group-hover:translate-x-4 transition-transform" />
                    </Button>
                </Link>
            </section>
        </main>
    );
}
