import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product/product-card';
import { Search } from 'lucide-react';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Search Results | Root & Loom',
    description: 'Search results for your query.',
};

interface SearchPageProps {
    searchParams: { q?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const query = searchParams.q;

    if (!query) {
        redirect('/shop');
    }

    const supabase = await createClient();

    const { data: results, error } = await supabase.rpc('search_products', {
        query_text: query,
        limit_count: 50
    });

    if (error) {
        console.error('Search Page Error:', error);
    }

    const products = results || [];

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col gap-4 mb-8">
                <h1 className="text-3xl font-serif font-bold text-deep-forest">
                    Search Results for <span className="text-primary italic">"{query}"</span>
                </h1>
                <p className="text-slate-500">
                    Found {products.length} {products.length === 1 ? 'result' : 'results'}
                </p>
            </div>

            {products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((p) => (
                        <ProductCard
                            key={p.id}
                            product={{
                                ...p,
                                product_images: p.image_url ? [{ image_url: p.image_url, alt_text: p.name }] : []
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                    <div className="h-16 w-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-stone-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-deep-forest mb-2">No results found</h2>
                    <p className="text-stone-500 max-w-md text-center">
                        We couldn't find any products matching "{query}". Try checking for typos or using different keywords.
                    </p>
                </div>
            )}
        </div>
    );
}
