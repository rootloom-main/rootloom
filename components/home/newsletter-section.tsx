'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowRight } from 'lucide-react';
import { FadeIn } from '@/components/ui/fade-in';

export function Newsletter() {
    return (
        <section className="py-24 bg-deep-forest text-heirloom-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 pattern-grid-lg pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <FadeIn>
                    <div className="max-w-3xl mx-auto text-center">
                        <Mail className="h-10 w-10 mx-auto mb-6 text-raw-clay opacity-80" />
                        <h2 className="text-3xl md:text-5xl font-serif mb-6">Join the Inner Circle</h2>
                        <p className="text-slate-300 text-lg mb-10 font-light leading-relaxed">
                            Subscribe to receive exclusive access to new collections, behind-the-scenes stories, and members-only offers.
                        </p>

                        <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
                            <div className="relative flex-1">
                                <Input
                                    type="email"
                                    placeholder="Enter your email address"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-12 rounded-full px-6 focus:border-raw-clay focus:ring-raw-clay transition-all"
                                />
                            </div>
                            <Button className="bg-raw-clay hover:bg-[#704837] text-white h-12 px-8 rounded-full uppercase text-xs tracking-widest transition-all">
                                Subscribe
                            </Button>
                        </form>

                        <p className="mt-6 text-xs text-slate-500 uppercase tracking-widest">
                            No spam, we promise. Unsubscribe anytime.
                        </p>
                    </div>
                </FadeIn>
            </div>
        </section>
    );
}
