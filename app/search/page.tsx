import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product/product-card';
import { Filter, X, ChevronDown, SlidersHorizontal, Search, Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import SearchLoading from './loading';
import SearchSort from './search-sort';

export const metadata = {
    title: 'Search Results | Root & Loom',
    description: 'Find premium sustainable fashion matching your style.',
};

type SearchPageProps = {
    searchParams: {
        q?: string;
        category?: string;
        minPrice?: string;
        maxPrice?: string;
        sort?: string;
        page?: string;
    };
};

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    product_images: { image_url: string; alt_text: string | null }[];
    product_variants?: { id: string; size: string; color: string; stock: number; price_adjustment: number }[];
    total_count: number;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const query = searchParams.q || '';
    const categoryFilter = searchParams.category;
    const minPrice = searchParams.minPrice ? parseFloat(searchParams.minPrice) : null;
    const maxPrice = searchParams.maxPrice ? parseFloat(searchParams.maxPrice) : null;
    const sortBy = searchParams.sort || 'relevance';
    const page = parseInt(searchParams.page || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Fetch categories for filter
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

    // Fetch search results
    const { data: results, error } = await supabase.rpc('search_products', {
        query_text: query,
        filter_category_id: categoryFilter ? ((await supabase.from('categories').select('id').eq('slug', categoryFilter).single()) as any).data?.id : null,
        min_price: minPrice,
        max_price: maxPrice,
        sort_by: sortBy,
        limit_count: limit,
        offset_count: offset
    } as any) as { data: SearchResult[] | null, error: any };

    // Fetch recommended products for empty state
    let recommendedProducts: any[] = [];
    if (!results || results.length === 0) {
        const { data: recs } = await supabase
            .from('products')
            .select('id, name, slug, base_price, product_images(image_url, alt_text), product_variants(id, size, color, stock, price_adjustment)')
            .eq('featured', true)
            .limit(4);
        recommendedProducts = recs || [];
    }

    if (error) {
        console.error('Search Page Error:', error);
    }

    const products = results || [];
    const totalCount = products[0]?.total_count || 0;
    const totalPages = Math.ceil(Number(totalCount) / limit);

    // Filter Sidebar Component
    const FilterSidebar = () => {
        const activeFiltersCount = (categoryFilter ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-deep-forest flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4" /> Filters
                    </h3>
                    {activeFiltersCount > 0 && (
                        <Link href={`/search?q=${query}`} className="text-xs text-red-500 hover:underline">
                            Clear All
                        </Link>
                    )}
                </div>

                {/* Active Filters */}
                {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {categoryFilter && (
                            <Link href={`/search?q=${query}${minPrice ? `&minPrice=${minPrice}` : ''}${maxPrice ? `&maxPrice=${maxPrice}` : ''}${sortBy ? `&sort=${sortBy}` : ''}`}>
                                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 hover:bg-stone-200 cursor-pointer border border-stone-200">
                                    {(categories as any[])?.find((c: any) => c.slug === categoryFilter)?.name || categoryFilter} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {(minPrice || maxPrice) && (
                            <Link href={`/search?q=${query}${categoryFilter ? `&category=${categoryFilter}` : ''}${sortBy ? `&sort=${sortBy}` : ''}`}>
                                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1 hover:bg-stone-200 cursor-pointer border border-stone-200">
                                    Price: {minPrice ? `₹${minPrice}` : '0'} - {maxPrice ? `₹${maxPrice}` : 'Any'} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                    </div>
                )}

                {/* Categories */}
                <div>
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-slate-500">Categories</h3>
                    <div className="space-y-2">
                        <Link
                            href={`/search?q=${query}${minPrice ? `&minPrice=${minPrice}` : ''}${maxPrice ? `&maxPrice=${maxPrice}` : ''}${sortBy ? `&sort=${sortBy}` : ''}`}
                            className={cn(
                                "flex items-center justify-between text-sm py-1.5 px-2 rounded-md transition-colors",
                                !categoryFilter ? 'bg-stone-100 font-bold text-deep-forest' : 'text-slate-600 hover:bg-stone-50 hover:text-deep-forest'
                            )}
                        >
                            <span>All Categories</span>
                        </Link>
                        {categories?.map((cat: any) => (
                            <Link
                                key={cat.id}
                                href={`/search?q=${query}&category=${cat.slug}${minPrice ? `&minPrice=${minPrice}` : ''}${maxPrice ? `&maxPrice=${maxPrice}` : ''}${sortBy ? `&sort=${sortBy}` : ''}`}
                                className={cn(
                                    "flex items-center justify-between text-sm py-1.5 px-2 rounded-md transition-colors",
                                    categoryFilter === cat.slug ? 'bg-stone-100 font-bold text-deep-forest' : 'text-slate-600 hover:bg-stone-50 hover:text-deep-forest'
                                )}
                            >
                                <span>{cat.name}</span>
                                {categoryFilter === cat.slug && <ChevronRight className="w-3.5 h-3.5" />}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Price Range */}
                <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-slate-500">Price Range</h3>
                    <div className="space-y-2">
                        {[
                            { label: 'Under ₹1000', min: null, max: 1000 },
                            { label: '₹1000 - ₹2500', min: 1000, max: 2500 },
                            { label: '₹2500 - ₹5000', min: 2500, max: 5000 },
                            { label: 'Over ₹5000', min: 5000, max: null },
                        ].map((range, i) => {
                            const isActive = minPrice === range.min && maxPrice === range.max;
                            return (
                                <Link
                                    key={i}
                                    href={`/search?q=${query}${categoryFilter ? `&category=${categoryFilter}` : ''}&minPrice=${range.min || ''}&maxPrice=${range.max || ''}${sortBy ? `&sort=${sortBy}` : ''}`}
                                    className={cn(
                                        "flex items-center gap-3 text-sm py-1.5 group cursor-pointer",
                                        isActive ? "font-bold text-deep-forest" : "text-slate-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                        isActive ? "bg-deep-forest border-deep-forest" : "border-slate-300 group-hover:border-deep-forest"
                                    )}>
                                        {isActive && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span>{range.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Suspense fallback={<SearchLoading />}>
            <div className="container mx-auto px-4 py-8 min-h-screen">
                {/* Breadcrumb */}
                <div className="flex items-center text-xs text-slate-500 mb-6">
                    <Link href="/" className="hover:text-deep-forest flex items-center gap-1"><Home className="w-3 h-3" /> Home</Link>
                    <ChevronRight className="w-3 h-3 mx-1" />
                    <span className="font-medium text-slate-900">Search Results</span>
                    {query && (
                        <>
                            <ChevronRight className="w-3 h-3 mx-1" />
                            <span className="text-deep-forest truncate max-w-[200px]">&quot;{query}&quot;</span>
                        </>
                    )}
                </div>

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-stone-100">
                    <div className="flex-1">
                        <h1 className="text-2xl font-serif font-bold text-deep-forest flex items-center gap-2">
                            {query ? (
                                <>Results for <span className="italic text-primary">&quot;{query}&quot;</span></>
                            ) : 'All Products'}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {totalCount > 0 ? (
                                <>Showing <strong>{products.length}</strong> of <strong>{Number(totalCount)}</strong> results</>
                            ) : (
                                '0 results found'
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Mobile Filter Sheet */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="md:hidden flex-1 gap-2 border-stone-200">
                                    <Filter className="w-4 h-4" /> Filters
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] overflow-y-auto">
                                <SheetHeader className="mb-6 text-left">
                                    <SheetTitle className="font-serif text- deep-forest">Filters</SheetTitle>
                                </SheetHeader>
                                <FilterSidebar />
                            </SheetContent>
                        </Sheet>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-2 flex-1 md:flex-none">
                            <span className="text-sm text-slate-500 whitespace-nowrap hidden sm:inline">Sort by:</span>
                            <SearchSort currentSort={sortBy} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="sticky top-24">
                            <FilterSidebar />
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {products.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.map((product) => (
                                        <ProductCard key={product.id} product={product} highlight={query} />
                                    ))}
                                </div>

                                {/* Pagination (Simple) */}
                                {totalPages > 1 && (
                                    <div className="mt-12 flex justify-center gap-2">
                                        {page > 1 && (
                                            <Link href={`/search?q=${query}&page=${page - 1}${categoryFilter ? `&category=${categoryFilter}` : ''}${sortBy ? `&sort=${sortBy}` : ''}`}>
                                                <Button variant="outline" size="sm" className="gap-1">
                                                    <ArrowLeft className="w-4 h-4" /> Previous
                                                </Button>
                                            </Link>
                                        )}
                                        <div className="flex items-center gap-1 px-4 text-sm font-medium text-slate-600">
                                            Page {page} of {totalPages}
                                        </div>
                                        {page < totalPages && (
                                            <Link href={`/search?q=${query}&page=${page + 1}${categoryFilter ? `&category=${categoryFilter}` : ''}${sortBy ? `&sort=${sortBy}` : ''}`}>
                                                <Button variant="outline" size="sm" className="gap-1">
                                                    Next <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="bg-stone-50 p-6 rounded-full mb-6">
                                    <Search className="w-12 h-12 text-stone-300" />
                                </div>
                                <h2 className="text-xl font-bold text-deep-forest mb-2">
                                    No results found for &quot;{query}&quot;
                                </h2>
                                <p className="text-slate-500 max-w-md mb-8">
                                    We couldn&apos;t find any products matching your search. Try checking for typos or searching for a different category.
                                </p>

                                {/* Recommendations */}
                                {recommendedProducts.length > 0 && (
                                    <div className="w-full mt-8 pt-8 border-t border-stone-100">
                                        <h3 className="text-lg font-bold text-deep-forest mb-6 text-left">You might like these</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                            {recommendedProducts.map(p => (
                                                <ProductCard key={p.id} product={p as any} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Link href="/">
                                    <Button className="mt-8 bg-deep-forest hover:bg-deep-forest/90 text-white px-8">
                                        Return to Home
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </Suspense>
    );
}
