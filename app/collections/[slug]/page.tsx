import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Truck, RotateCcw, ShieldCheck, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { CollectionProductGrid } from '@/components/collection/collection-product-grid';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: collection } = await (supabase.from('collections' as unknown as any) as any)
        .select('name, description, seo_metadata')
        .eq('slug', slug)
        .single();

    if (!collection) return { title: 'Collection | Root & Loom' };

    const seo = (collection as any).seo_metadata || {};
    return {
        title: seo.title || `${collection.name} | Root & Loom`,
        description: seo.description || collection.description || `Discover the ${collection.name} collection at Root & Loom.`,
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
        const hasCategoryRule = col.rules.some((r: any) => r.field === 'category');
        
        let query = (supabase.from('products' as unknown as any) as any)
            .select(`
                id,
                name,
                slug,
                base_price,
                description,
                product_images(image_url, alt_text, display_order),
                product_variants(id, size, color, stock, price_adjustment)
                ${hasCategoryRule ? ', categories!inner(slug)' : ', categories(slug)'}
            `);

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

        if (col.sort_by === 'price-low') query = query.order('base_price', { ascending: true });
        else if (col.sort_by === 'price-high') query = query.order('base_price', { ascending: false });
        else if (col.sort_by === 'oldest') query = query.order('created_at', { ascending: true });
        else query = query.order('created_at', { ascending: false });

        const { data } = await query.limit(60);
        productList = data || [];
    } else {
        const { data: products } = await (supabase
            .from('collection_products' as unknown as any) as any)
            .select(`
                products (
                    id,
                    name,
                    slug,
                    base_price,
                    description,
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
            {/* Editorial Hero Header */}
            <section className="relative overflow-hidden bg-black text-white min-h-[280px] sm:min-h-[340px] md:min-h-[380px] flex items-center">
                {/* Background image with high-end overlay */}
                {col.image_url ? (
                    <div className="absolute inset-0 z-0">
                        <Image 
                            src={col.image_url} 
                            alt={col.name} 
                            fill 
                            className="object-cover object-center opacity-40 brightness-75 scale-105 transition-transform duration-1000"
                            priority
                            sizes="100vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
                    </div>
                ) : (
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-stone-900 via-black to-stone-950" />
                )}

                {/* Content Container */}
                <div className="container mx-auto px-4 sm:px-6 relative z-10 py-12 sm:py-16 md:py-20">
                    {/* Breadcrumbs */}
                    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-stone-400 mb-6">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span>/</span>
                        <Link href="/collections" className="hover:text-white transition-colors">Collections</Link>
                        <span>/</span>
                        <span className="text-white truncate max-w-[200px] sm:max-w-none">{col.name}</span>
                    </nav>

                    <div className="max-w-3xl">
                        {/* Badge */}
                        {col.badge_label ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-white/15 backdrop-blur-md text-white border border-white/20 mb-4 shadow-xs">
                                <Sparkles className="h-3 w-3 text-amber-400 fill-amber-400" />
                                <span>{col.badge_label}</span>
                            </div>
                        ) : (
                            <span className="inline-block text-[11px] font-bold tracking-[0.25em] text-stone-300 uppercase mb-3">
                                Root & Loom // Curated Edition
                            </span>
                        )}

                        {/* Title - Elegant, impactful, and properly sized */}
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4 leading-tight drop-shadow-sm">
                            {col.name}
                        </h1>

                        {/* Description */}
                        {col.description ? (
                            <p className="text-xs sm:text-sm md:text-base text-stone-300 font-light leading-relaxed max-w-2xl line-clamp-3 md:line-clamp-none">
                                {col.description}
                            </p>
                        ) : null}

                        {/* Quick Highlights */}
                        <div className="flex flex-wrap items-center gap-6 mt-6 pt-6 border-t border-white/10 text-xs sm:text-sm text-stone-300 font-medium">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                <span>{productList.length} {productList.length === 1 ? 'Design' : 'Designs'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Free Shipping Above ₹999</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <span>Pure Breathable Fabrics</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Product Grid & Toolbar */}
            <CollectionProductGrid products={productList} collectionName={col.name} />

            {/* Reassurance Bar */}
            <section className="border-t border-stone-200 bg-stone-50/80 py-12 mt-12">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center mb-3 text-stone-800">
                                <Truck className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">Express Delivery</h4>
                            <p className="text-[11px] text-stone-500 mt-1">Fast shipping across all Indian pincodes</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center mb-3 text-stone-800">
                                <RotateCcw className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">7-Day Easy Returns</h4>
                            <p className="text-[11px] text-stone-500 mt-1">Hassle-free doorstep pickup & exchange</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center mb-3 text-stone-800">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">Craftsmanship Guaranteed</h4>
                            <p className="text-[11px] text-stone-500 mt-1">Hand-picked textiles & tailored fits</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center mb-3 text-stone-800">
                                <Lock className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">100% Secure Checkout</h4>
                            <p className="text-[11px] text-stone-500 mt-1">Razorpay, UPI & Cash on Delivery</p>
                        </div>
                    </div>
                </div>
            </section>
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
