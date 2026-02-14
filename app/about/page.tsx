import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Leaf, Users, Heart, Globe } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="bg-white min-h-screen">
            {/* Hero Section - Immersive Experience */}
            <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://images.pexels.com/photos/3771612/pexels-photo-3771612.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        alt="Artisan weaving fabric on a traditional loom"
                        fill
                        className="object-cover brightness-[0.4] scale-105 animate-slow-zoom"
                        priority
                    />
                </div>
                <div className="relative z-10 text-center text-white max-w-4xl px-4 animate-fade-in-up">
                    <span className="text-sm md:text-base font-medium tracking-[0.2em] uppercase mb-4 block text-gray-300">
                        Since 2023
                    </span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-8 leading-tight">
                        Woven with <br /> <span className="text-heirloom-white italic">Purpose & Soul</span>
                    </h1>
                    <p className="text-lg md:text-2xl font-light tracking-wide text-gray-200 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Root & Loom bridges the gap between ancient craftsmanship and modern luxury.
                    </p>
                    <Link href="#our-story">
                        <Button variant="outline" className="border-white text-white hover:bg-white hover:text-black transition-all rounded-full px-8 py-6 text-lg">
                            Discover Our Story
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Mission Statement - Typography Focused */}
            <section id="our-story" className="py-24 md:py-32 container mx-auto px-4 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-serif font-medium leading-tight text-gray-900 mb-12">
                        "We believe that true luxury lies in the story behind the garment—the hands that wove it, the soil that grew it, and the legacy it carries."
                    </h2>
                    <div className="w-24 h-1 bg-gray-900 mx-auto opacity-20"></div>
                </div>
            </section>

            {/* Alternating Story Sections */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 space-y-24">
                    {/* Part 1: The Root */}
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl group">
                            <Image
                                src="https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg?auto=compress&cs=tinysrgb&w=1200"
                                alt="Ethical cotton farming"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <span className="text-emerald-700 font-medium tracking-wider uppercase text-sm">The Beginning</span>
                                <h3 className="text-4xl md:text-5xl font-serif text-gray-900">Rooted in Earth</h3>
                            </div>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Our journey begins in the fields of India, where we partner directly with farmers who practice regenerative agriculture. By eschewing harmful chemicals and embracing organic methods, we ensure that every fiber is as kind to the earth as it is to your skin.
                            </p>
                            <ul className="space-y-4 pt-4">
                                {['GOTS Certified Organic Cotton', 'Regenerative Farming Practices', 'Water-Saving Techniques'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-700">
                                        <Leaf className="w-5 h-5 text-emerald-600" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Part 2: The Loom */}
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center md:flex-row-reverse">
                        <div className="order-2 md:order-1 space-y-8">
                            <div className="space-y-4">
                                <span className="text-amber-700 font-medium tracking-wider uppercase text-sm">The Craft</span>
                                <h3 className="text-4xl md:text-5xl font-serif text-gray-900">Woven by Masters</h3>
                            </div>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Fast fashion has forgotten the art of patience. We haven't. Our fabrics are hand-loomed by master artisans whose skills have been passed down through generations. Each irregularity in the weave is not a flaw, but a signature of human touch.
                            </p>
                            <Link href="/shop" className="inline-flex items-center gap-2 text-gray-900 font-medium hover:text-amber-700 transition-colors group">
                                Explore Handwoven Collection <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl order-1 md:order-2 group">
                            <Image
                                src="https://images.pexels.com/photos/4614167/pexels-photo-4614167.jpeg?auto=compress&cs=tinysrgb&w=1200"
                                alt="Artisan working on a loom"
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Values Grid */}
            <section className="py-24 container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6">Our Promise to You</h2>
                    <p className="text-gray-600 text-lg">
                        We don't just sell clothes; we advocate for a better way of living. One that values quality over quantity and people over profit.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: Globe,
                            title: 'Transparent Sourcing',
                            desc: 'Know exactly where your clothes come from. We provide full transparency from farm to closet.'
                        },
                        {
                            icon: Users,
                            title: 'Fair Wages',
                            desc: 'We ensure living wages for all our artisans, empowering communities and preserving heritage.'
                        },
                        {
                            icon: Heart,
                            title: 'Circular Fashion',
                            desc: 'Designed for longevity. Our take-back program ensures old garments act as nutrients for new ones.'
                        }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-gray-50 p-10 rounded-xl text-center hover:shadow-xl transition-shadow duration-300 border border-transparent hover:border-gray-200">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-6 text-gray-900">
                                <item.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Visual Break / Quote */}
            <section className="relative py-32 bg-gray-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <Image
                        src="https://images.pexels.com/photos/994523/pexels-photo-994523.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        alt="Fabric texture details"
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <blockquote className="text-2xl md:text-4xl font-serif italic max-w-4xl mx-auto leading-relaxed">
                        "Fashion should be a form of escapism, not a form of imprisonment."
                    </blockquote>
                    <cite className="block mt-8 text-gray-400 not-italic uppercase tracking-widest text-sm">— Alexander McQueen</cite>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 container mx-auto px-4 text-center">
                <div className="bg-heirloom-white/30 rounded-3xl p-12 md:p-20 border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900">Wear the Change</h2>
                        <p className="text-lg text-gray-600">
                            Join thousands of conscious consumers who are redefining luxury. Experience the difference of ethically crafted fashion.
                        </p>
                        <div className="pt-4">
                            <Link href="/shop">
                                <Button size="lg" className="bg-gray-900 text-white hover:bg-gray-800 rounded-full px-10 h-14 text-lg shadow-lg hover:shadow-xl transition-all">
                                    Shop the Collection
                                </Button>
                            </Link>
                        </div>
                    </div>
                    {/* Decorative background elements if needed */}
                </div>
            </section>
        </div>
    );
}

