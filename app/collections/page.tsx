import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Layers, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CollectionsIndexPage() {
    const supabase = await createClient();
    
    const { data: collections } = await (supabase.from('collections' as unknown as any) as any)
        .select('id, name, slug, description, image_url, badge_label, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return (
        <div className="min-h-screen bg-heirloom-white pb-32">
            {/* Elegant Header */}
            <div className="bg-deep-forest text-white py-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-raw-clay/10 rounded-full blur-3xl -mr-48 -mt-48" />
                <div className="container mx-auto relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-serif font-black italic uppercase mb-4 tracking-tighter">
                        The <span className="text-raw-clay">Collections</span>
                    </h1>
                    <p className="text-stone-300 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed">
                        Explore our curated archives and limited-edition marketing campaigns. 
                        Handcrafted narratives, designed for the discerning.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-12 relative z-20">
                {!collections || collections.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-24 text-center border-4 border-dashed border-stone-100 shadow-xl">
                        <Layers className="h-16 w-16 text-stone-200 mx-auto mb-6" />
                        <h2 className="text-2xl font-serif font-bold text-stone-400 uppercase italic tracking-widest">Awaiting the next chapter</h2>
                        <p className="text-sm text-stone-400 mt-2 font-medium">New curated collections are currently being prepared in our workshops.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {collections.map((collection: any) => (
                            <Link 
                                key={collection.id} 
                                href={`/collections/${collection.slug}`}
                                className="group block h-full"
                            >
                                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-lg border border-stone-100 h-full flex flex-col transition-all duration-700 hover:shadow-2xl hover:-translate-y-2">
                                    {/* Image Container */}
                                    <div className="relative h-72 md:h-80 overflow-hidden">
                                        {collection.image_url ? (
                                            <Image 
                                                src={collection.image_url} 
                                                alt={collection.name} 
                                                fill 
                                                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                                                <Layers className="h-12 w-12 text-stone-300" />
                                            </div>
                                        )}
                                        {/* Overlay Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-deep-forest/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                                        
                                        {collection.badge_label && (
                                            <div className="absolute top-6 left-6 animate-pulse">
                                                <Badge className="bg-white/90 backdrop-blur-md text-deep-forest border-none px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">
                                                    <Sparkles className="h-3 w-3 mr-2 text-amber-500 fill-amber-500 inline" />
                                                    {collection.badge_label}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-10 flex flex-col flex-1">
                                        <h3 className="text-3xl font-serif font-bold text-deep-forest mb-4 group-hover:text-raw-clay transition-colors duration-300 tracking-tight">
                                            {collection.name}
                                        </h3>
                                        <p className="text-stone-500 font-medium text-sm leading-relaxed mb-8 flex-1">
                                            {collection.description || "Step into a world of curated excellence and craft-first design."}
                                        </p>
                                        
                                        <div className="pt-6 border-t border-stone-100 flex items-center justify-between text-deep-forest font-black uppercase text-[11px] tracking-widest">
                                            <span>Enter Archive</span>
                                            <div className="h-10 w-10 rounded-full border border-stone-200 flex items-center justify-center group-hover:bg-deep-forest group-hover:text-white transition-all duration-500">
                                                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
