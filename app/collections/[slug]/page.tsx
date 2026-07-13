import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Layers, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: collection } = await (supabase.from('collections' as unknown as any) as any)
        .select('name, description, seo_metadata')
        .eq('slug', slug)
        .single();

    if (!collection) return { title: 'Collection' };

    const seo = (collection as any).seo_metadata || {};
    return {
        title: seo.title || collection.name,
        description: seo.description || collection.description,
    };
}

async function CollectionContent({ slug }: { slug: string }) {
    const supabase = await createClient();

    // 1. Fetch Collection
    const { data: collection, error } = await (supabase
        .from('collections' as unknown as any) as any)
        .select('id, name, slug, description, image_url, badge_label, seo_metadata, type, rules, sort_by')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

    if (error || !collection) notFound();

    const col = collection as any;
    let productList: any[] = [];

    // 2. Fetch Products based on Type
    if (col.type === 'automated' && col.rules && col.rules.length > 0) {
        // Automated Collection Logic
        const hasCategoryRule = col.rules.some((r: any) => r.field === 'category');
        
        let query = (supabase.from('products' as unknown as any) as any)
            .select(`
                id,
                name,
                slug,
                base_price,
                product_images(image_url, alt_text, display_order),
                product_variants(id, size, color, stock, price_adjustment)
                ${hasCategoryRule ? ', categories!inner(slug)' : ', categories(slug)'}
            `);

        // Apply rules (AND logic between rules)
        col.rules.forEach((rule: any) => {
            if (rule.field === 'category' && rule.value) {
                query = query.eq('categories.slug', rule.value);
            }
            if (rule.field === 'price' && rule.value) {
                const price = parseFloat(rule.value);
                if (!isNaN(price)) {
                    if (rule.operator === 'greater_than') query = query.gt('base_price', price);
                    else if (rule.operator === 'less_than') query = query.lt('base_price', price);
                    else if (rule.operator === 'equals') query = query.eq('base_price', price);
                }
            }
        });

        // Apply Sorting
        if (col.sort_by === 'price-low') query = query.order('base_price', { ascending: true });
        else if (col.sort_by === 'price-high') query = query.order('base_price', { ascending: false });
        else if (col.sort_by === 'oldest') query = query.order('created_at', { ascending: true });
        else query = query.order('created_at', { ascending: false }); // Default newest

        const { data } = await query.limit(40);
        productList = data || [];
    } else {
        // Manual Collection Logic
        const { data: products } = await (supabase
            .from('collection_products' as unknown as any) as any)
            .select(`
                products (
                    id,
                    name,
                    slug,
                    base_price,
                    product_images(image_url, alt_text, display_order),
                    product_variants(id, size, color, stock, price_adjustment)
                )
            `)
            .eq('collection_id', col.id)
            .order('manual_display_order', { ascending: true });

        productList = products?.map((p: any) => p.products).filter(Boolean) || [];
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Hero / Header */}
            <div className="relative h-[50vh] md:h-[65vh] bg-slate-900 overflow-hidden flex flex-col items-center justify-center px-6">
                {col.image_url && (
                    <Image 
                        src={col.image_url} 
                        alt={col.name} 
                        fill 
                        className="object-cover opacity-60"
                        priority
                    />
                ) }
                
                {/* Decorative Elements */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-white" />
                
                <div className="relative z-10 text-center max-w-4xl">
                    {col.badge_label && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full mb-6 border-b-4 border-slate-200 shadow-xl animate-bounce">
                            <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-black tracking-widest text-slate-900 uppercase">
                                {col.badge_label}
                            </span>
                        </div>
                    )}
                    
                    {!col.badge_label && (
                        <span className="text-[10px] font-black tracking-[0.4em] text-white/50 uppercase mb-4 block">Root & Loom // Curated Collection</span>
                    )}
                    
                    <h1 className="text-5xl md:text-9xl font-black italic uppercase text-white mb-6 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] leading-[0.9]">
                        {col.name}
                    </h1>
                    
                    {col.description && (
                        <p className="text-base md:text-xl text-white/90 font-medium max-w-2xl mx-auto drop-shadow-lg leading-relaxed">
                            {col.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Product Grid */}
            <div className="container mx-auto px-6 py-16 md:py-32">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-16 border-b-2 border-slate-100 pb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Inventory Status</h2>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black italic uppercase text-slate-900">
                            {productList.length} {productList.length === 1 ? 'Masterpiece' : 'Collectibles'}
                        </h3>
                    </div>
                </div>

                {productList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 rounded-[3rem] bg-slate-50 border-4 border-dashed border-slate-100">
                        <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                            <Layers className="h-10 w-10 text-slate-200" />
                        </div>
                        <p className="text-2xl font-black uppercase italic text-slate-300">Section is being refilled</p>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">New arrivals incoming shortly</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-16">
                        {productList.map((product, index) => (
                            <div key={product.id} className="group">
                                <ProductCard product={product} priority={index < 4} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <Suspense fallback={<div className="min-h-screen pt-20"><ProductGridSkeleton count={8} /></div>}>
            <CollectionContent slug={slug} />
        </Suspense>
    );
}
