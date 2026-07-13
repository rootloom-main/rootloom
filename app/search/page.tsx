import { createSSRClient as createClient, getCurrentUser } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/product/product-card';
import { Filter, X, ChevronDown, SlidersHorizontal, Search, Home, ChevronRight, ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
    searchParams: Promise<{
        q?: string;
        category?: string;
        brand?: string;
        size?: string;
        color?: string;
        material?: string;
        fit?: string;
        availability?: string;
        minPrice?: string;
        maxPrice?: string;
        sort?: string;
        page?: string;
    }>;
};

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    base_price: number;
    category_name: string;
    similarity_score: number;
    average_rating: number;
    review_count: number;
    total_stock: number;
    total_count: number;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const resolvedSearchParams = await searchParams;
    const query = resolvedSearchParams.q || '';
    const categoryFilter = resolvedSearchParams.category || '';
    const brandFilter = resolvedSearchParams.brand || '';
    const sizeFilter = resolvedSearchParams.size || '';
    const colorFilter = resolvedSearchParams.color || '';
    const materialFilter = resolvedSearchParams.material || '';
    const fitFilter = resolvedSearchParams.fit || '';
    const availabilityFilter = resolvedSearchParams.availability || ''; // 'in_stock' | 'out_of_stock'

    const minPrice = resolvedSearchParams.minPrice ? parseFloat(resolvedSearchParams.minPrice) : null;
    const maxPrice = resolvedSearchParams.maxPrice ? parseFloat(resolvedSearchParams.maxPrice) : null;
    const sortBy = resolvedSearchParams.sort || 'relevance';
    const page = parseInt(resolvedSearchParams.page || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    const user = await getCurrentUser();

    // Declare fallback arrays and values
    let categories: any[] = [];
    let brands: string[] = [];
    let colors: string[] = [];
    let sizes: string[] = [];
    let materials: string[] = [];
    let fits: string[] = [];
    let products: any[] = [];
    let totalCount = 0;
    let spellingSuggestion: string | null = null;
    let recommendedProducts: any[] = [];

    // 1. Check for search redirects first
    if (query.trim()) {
        try {
            const { data: redirectRow } = await supabase
                .from('search_redirects')
                .select('redirect_url')
                .eq('query_text', query.trim().toLowerCase())
                .eq('is_active', true)
                .maybeSingle();

            if (redirectRow) {
                redirect(redirectRow.redirect_url);
            }
        } catch (e) {
            console.error('Search redirect check failed:', e);
        }
    }

    try {
        // 2. Fetch categories for filters
        const { data: categoriesData } = await supabase
            .from('categories')
            .select('id, name, slug')
            .order('name');
        categories = categoriesData || [];

        // 3. Fetch dynamically available filter options (brands, colors, sizes, materials, fits)
        const [
            rawBrandsRes,
            rawVariantsRes,
            rawMaterialsRes,
            rawFitsRes
        ] = await Promise.all([
            supabase.from('products').select('metadata->brand').is('deleted_at', null).eq('status', 'active'),
            supabase.from('product_variants').select('color, size'),
            supabase.from('products').select('metadata->material').is('deleted_at', null).eq('status', 'active'),
            supabase.from('products').select('metadata->fit').is('deleted_at', null).eq('status', 'active')
        ]);

        const rawBrands = rawBrandsRes.data;
        const rawVariants = rawVariantsRes.data;
        const rawMaterials = rawMaterialsRes.data;
        const rawFits = rawFitsRes.data;

        brands = Array.from(new Set(rawBrands?.map((p: any) => p.brand).filter(Boolean))) as string[];
        colors = Array.from(new Set(rawVariants?.map((v: any) => v.color).filter(Boolean))) as string[];
        materials = Array.from(new Set(rawMaterials?.map((p: any) => p.material).filter(Boolean))) as string[];
        fits = Array.from(new Set(rawFits?.map((p: any) => p.fit).filter(Boolean))) as string[];

        // Smart size sort: numeric sizes sorted numerically, alpha sizes (XS/S/M/L/XL/XXL) in clothing order
        const rawSizes = Array.from(new Set(rawVariants?.map((v: any) => v.size).filter(Boolean))) as string[];
        const alphaOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL'];
        sizes = rawSizes.sort((a, b) => {
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            const aIsNum = !isNaN(aNum);
            const bIsNum = !isNaN(bNum);
            // Both numeric — sort numerically
            if (aIsNum && bIsNum) return aNum - bNum;
            // Both alpha — sort by clothing order
            const aIdx = alphaOrder.indexOf(a.toUpperCase());
            const bIdx = alphaOrder.indexOf(b.toUpperCase());
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            // One alpha, one numeric — numerics first
            if (aIsNum) return -1;
            if (bIsNum) return 1;
            // Fallback alphabetical
            return a.localeCompare(b);
        });
    } catch (e) {
        console.error('Search filters data fetching failed:', e);
    }

    // 4. Fetch search results using upgraded RPC
    const categoryUUID = categoryFilter ? categories?.find(c => c.slug === categoryFilter)?.id : null;
    const isAvailableOnly = availabilityFilter === 'in_stock' ? true : availabilityFilter === 'out_of_stock' ? false : null;

    try {
        const { data: results, error } = await supabase.rpc('search_products', {
            query_text: query,
            filter_category_id: categoryUUID,
            min_price: minPrice,
            max_price: maxPrice,
            sort_by: sortBy,
            limit_count: limit,
            offset_count: offset,
            filter_brand: brandFilter || null,
            filter_size: sizeFilter || null,
            filter_color: colorFilter || null,
            filter_material: materialFilter || null,
            filter_fit: fitFilter || null,
            filter_availability: isAvailableOnly
        } as any) as { data: SearchResult[] | null, error: any };

        if (error) {
            console.error('Search Page RPC Error:', error);
        } else if (results) {
            products = results;
            totalCount = products[0]?.total_count || 0;
        }
    } catch (e) {
        console.error('Search RPC call failed:', e);
    }

    const totalPages = Math.ceil(Number(totalCount) / limit);

    // 5. Asynchronously log query in search_analytics (non-blocking)
    if (query.trim()) {
        createAdminClient().then((supabaseAdmin: any) => {
            supabaseAdmin.from('search_analytics').insert({
                query_text: query.trim().toLowerCase(),
                results_count: Number(totalCount),
                user_id: user?.id || null
            }).then(({ error: logError }: { error: any }) => {
                if (logError) console.error('Error logging search query:', logError);
            });
        }).catch(err => {
            console.error('Failed to log search query asynchronously:', err);
        });
    }

    // 6. Spelling Suggestion fetch if no results
    if (query && products.length === 0) {
        try {
            const { data: suggestWord } = await supabase
                .rpc('get_search_spelling_suggestion', { query_text: query });
            if (suggestWord && suggestWord !== query) {
                spellingSuggestion = suggestWord;
            }
        } catch (e) {
            console.error('Spelling suggestion fetch failed:', e);
        }
    }

    // 7. Recommended products for empty state
    if (products.length === 0) {
        try {
            const { data: recs } = await supabase
                .from('products')
                .select('id, name, slug, base_price, product_images(image_url, alt_text)')
                .eq('featured', true)
                .limit(4);
            recommendedProducts = recs || [];
        } catch (e) {
            console.error('Fetching recommended products failed:', e);
        }
    }

    // Helper to generate filter URLs cleanly
    function buildFilterUrl(newParams: Record<string, any>) {
        const current = {
            q: query,
            category: categoryFilter,
            brand: brandFilter,
            size: sizeFilter,
            color: colorFilter,
            material: materialFilter,
            fit: fitFilter,
            availability: availabilityFilter,
            minPrice: minPrice ? String(minPrice) : '',
            maxPrice: maxPrice ? String(maxPrice) : '',
            sort: sortBy,
            page: '1' // Reset to first page on filter change
        };

        const merged = { ...current, ...newParams };
        const searchParams = new URLSearchParams();
        Object.entries(merged).forEach(([key, val]) => {
            if (val) searchParams.set(key, val);
        });
        return `/search?${searchParams.toString()}`;
    }

    // Map RPC output format to standard ProductCard component input
    const mappedProducts = products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        base_price: Number(p.base_price),
        product_images: p.image_url ? [{ image_url: p.image_url, alt_text: p.name }] : [],
        product_variants: []
    }));

    const activeFiltersCount =
        (categoryFilter ? 1 : 0) +
        (brandFilter ? 1 : 0) +
        (sizeFilter ? 1 : 0) +
        (colorFilter ? 1 : 0) +
        (materialFilter ? 1 : 0) +
        (fitFilter ? 1 : 0) +
        (availabilityFilter ? 1 : 0) +
        (minPrice || maxPrice ? 1 : 0);

    const FilterSidebar = () => {
        return (
            <div className="space-y-6 select-none font-sans">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <h3 className="font-bold text-deep-forest flex items-center gap-2 text-sm tracking-wide uppercase">
                        <SlidersHorizontal className="w-4 h-4" /> Filters
                    </h3>
                    {activeFiltersCount > 0 && (
                        <Link href={`/search?q=${query}`} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Clear All
                        </Link>
                    )}
                </div>

                {/* Active Filter Badges */}
                {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-4 border-b border-stone-100">
                        {categoryFilter && (
                            <Link href={buildFilterUrl({ category: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    Cat: {categoryFilter} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {brandFilter && (
                            <Link href={buildFilterUrl({ brand: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    Brand: {brandFilter} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {sizeFilter && (
                            <Link href={buildFilterUrl({ size: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    Size: {sizeFilter} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {colorFilter && (
                            <Link href={buildFilterUrl({ color: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    Color: {colorFilter} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {materialFilter && (
                            <Link href={buildFilterUrl({ material: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    Mat: {materialFilter} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {fitFilter && (
                            <Link href={buildFilterUrl({ fit: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    Fit: {fitFilter} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {availabilityFilter && (
                            <Link href={buildFilterUrl({ availability: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    {availabilityFilter === 'in_stock' ? 'In Stock' : 'Out of Stock'} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                        {(minPrice || maxPrice) && (
                            <Link href={buildFilterUrl({ minPrice: '', maxPrice: '' })}>
                                <Badge variant="secondary" className="gap-1 bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    Price: {minPrice ? `₹${minPrice}` : '0'}-{maxPrice ? `₹${maxPrice}` : 'Any'} <X className="w-3 h-3" />
                                </Badge>
                            </Link>
                        )}
                    </div>
                )}

                {/* Categories */}
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Categories</h4>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                        {categories?.map((cat) => (
                            <Link
                                key={cat.id}
                                href={buildFilterUrl({ category: categoryFilter === cat.slug ? '' : cat.slug })}
                                className={cn(
                                    "text-sm py-1 px-2 rounded transition-all flex items-center justify-between",
                                    categoryFilter === cat.slug ? 'bg-deep-forest text-white font-bold' : 'text-slate-600 hover:bg-stone-100'
                                )}
                            >
                                <span>{cat.name}</span>
                                {categoryFilter === cat.slug && <X className="w-3 h-3" />}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Brands */}
                {brands.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-stone-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Brands</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {brands.map(brand => (
                                <Link key={brand} href={buildFilterUrl({ brand: brandFilter === brand ? '' : brand })}>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "cursor-pointer rounded-full font-medium py-1 px-3 border-stone-200 text-stone-600 hover:border-deep-forest",
                                            brandFilter === brand && "bg-deep-forest text-white border-deep-forest hover:bg-deep-forest"
                                        )}
                                    >
                                        {brand}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sizes */}
                {sizes.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-stone-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Sizes</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {sizes.map(size => (
                                <Link key={size} href={buildFilterUrl({ size: sizeFilter === size ? '' : size })}>
                                    <div
                                        className={cn(
                                            "w-9 h-9 border rounded-sm flex items-center justify-center text-xs font-bold cursor-pointer transition-all border-stone-200 hover:border-deep-forest text-stone-600",
                                            sizeFilter === size && "bg-deep-forest text-white border-deep-forest"
                                        )}
                                    >
                                        {size}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Colors */}
                {colors.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-stone-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Colors</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {colors.map(color => (
                                <Link key={color} href={buildFilterUrl({ color: colorFilter === color ? '' : color })}>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "cursor-pointer rounded-full font-medium py-1 px-3 border-stone-200 text-stone-600 hover:border-deep-forest",
                                            colorFilter === color && "bg-deep-forest text-white border-deep-forest hover:bg-deep-forest"
                                        )}
                                    >
                                        {color}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Availability */}
                <div className="space-y-2 pt-4 border-t border-stone-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Availability</h4>
                    <div className="flex flex-col gap-1">
                        <Link href={buildFilterUrl({ availability: availabilityFilter === 'in_stock' ? '' : 'in_stock' })} className={cn(
                            "text-sm py-1 px-2 rounded flex items-center justify-between",
                            availabilityFilter === 'in_stock' ? "bg-stone-100 text-deep-forest font-bold" : "text-slate-600 hover:bg-stone-50"
                        )}>
                            <span>In Stock First</span>
                            {availabilityFilter === 'in_stock' && <X className="w-3.5 h-3.5" />}
                        </Link>
                    </div>
                </div>

                {/* Price Ranges */}
                <div className="space-y-2 pt-4 border-t border-stone-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Price</h4>
                    <div className="flex flex-col gap-1">
                        {[
                            { label: 'Under ₹1,000', min: '', max: '1000' },
                            { label: '₹1,000 - ₹2,500', min: '1000', max: '2500' },
                            { label: '₹2,500 - ₹5,000', min: '2500', max: '5000' },
                            { label: 'Over ₹5,000', min: '5000', max: '' },
                        ].map((range, idx) => {
                            const isSelected = (minPrice === (range.min ? parseFloat(range.min) : null)) && (maxPrice === (range.max ? parseFloat(range.max) : null));
                            return (
                                <Link
                                    key={idx}
                                    href={buildFilterUrl({ minPrice: isSelected ? '' : range.min, maxPrice: isSelected ? '' : range.max })}
                                    className={cn(
                                        "text-sm py-1 px-2 rounded flex items-center justify-between",
                                        isSelected ? "bg-stone-100 text-deep-forest font-bold" : "text-slate-600 hover:bg-stone-50"
                                    )}
                                >
                                    <span>{range.label}</span>
                                    {isSelected && <X className="w-3.5 h-3.5" />}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Suspense fallback={<SearchLoading />}>
            <div className="container mx-auto px-4 py-8 min-h-screen font-sans">
                {/* Breadcrumbs */}
                <div className="flex items-center text-xs text-slate-500 mb-6">
                    <Link href="/" className="hover:text-deep-forest flex items-center gap-1"><Home className="w-3 h-3" /> Home</Link>
                    <ChevronRight className="w-3 h-3 mx-1" />
                    <span className="font-medium text-slate-900">Search</span>
                    {query && (
                        <>
                            <ChevronRight className="w-3 h-3 mx-1" />
                            <span className="text-deep-forest italic truncate max-w-[200px]">&quot;{query}&quot;</span>
                        </>
                    )}
                </div>

                {/* Page Title Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-5 border-b border-stone-100">
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-deep-forest flex items-center gap-2">
                            {query ? (
                                <>Results for <span className="italic text-primary">&quot;{query}&quot;</span></>
                            ) : 'All Styles'}
                        </h1>
                        <p className="text-xs md:text-sm text-slate-400 mt-1">
                            {totalCount > 0 ? (
                                <>Found <strong>{Number(totalCount)}</strong> items matches</>
                            ) : (
                                'No matching items'
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="md:hidden flex-1 gap-2 border-stone-200 h-10 text-xs uppercase font-bold tracking-wider">
                                    <Filter className="w-4 h-4" /> Filters ({activeFiltersCount})
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] overflow-y-auto">
                                <SheetHeader className="mb-6 text-left">
                                    <SheetTitle className="font-serif text-deep-forest">Filters</SheetTitle>
                                </SheetHeader>
                                <FilterSidebar />
                            </SheetContent>
                        </Sheet>

                        <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">
                            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold hidden sm:inline">Sort:</span>
                            <SearchSort currentSort={sortBy} />
                        </div>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="hidden lg:block w-60 flex-shrink-0">
                        <div className="sticky top-24">
                            <FilterSidebar />
                        </div>
                    </aside>

                    <main className="flex-1">
                        {spellingSuggestion && (
                            <div className="mb-6 bg-yellow-50/50 border border-yellow-100 p-4 rounded flex items-center gap-3 animate-in fade-in duration-300">
                                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                <span className="text-sm text-stone-700">
                                    Did you mean:{" "}
                                    <Link href={`/search?q=${encodeURIComponent(spellingSuggestion)}`} className="font-bold text-deep-forest hover:underline">
                                        {spellingSuggestion}
                                    </Link>
                                    ?
                                </span>
                            </div>
                        )}

                        {mappedProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                    {mappedProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} highlight={query} />
                                    ))}
                                </div>

                                {totalPages > 1 && (
                                    <div className="mt-12 flex justify-center gap-2">
                                        {page > 1 && (
                                            <Link href={buildFilterUrl({ page: String(page - 1) })}>
                                                <Button variant="outline" size="sm" className="gap-1 h-9 rounded-sm border-stone-200 text-stone-600">
                                                    <ArrowLeft className="w-4 h-4" /> Prev
                                                </Button>
                                            </Link>
                                        )}
                                        {/* Page Number Buttons */}
                                        <div className="flex items-center gap-1.5">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                                                const isCurrent = p === page;
                                                return (
                                                    <Link key={p} href={buildFilterUrl({ page: String(p) })}>
                                                        <Button
                                                            variant={isCurrent ? "default" : "outline"}
                                                            size="sm"
                                                            className={cn(
                                                                "h-9 w-9 rounded-sm border-stone-200 text-xs font-bold",
                                                                isCurrent ? "bg-deep-forest text-white hover:bg-deep-forest/90" : "text-stone-600 hover:bg-stone-50"
                                                            )}
                                                        >
                                                            {p}
                                                        </Button>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                        {page < totalPages && (
                                            <Link href={buildFilterUrl({ page: String(page + 1) })}>
                                                <Button variant="outline" size="sm" className="gap-1 h-9 rounded-sm border-stone-200 text-stone-600">
                                                    Next <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="bg-stone-50 p-6 rounded-full mb-6 border border-stone-100">
                                    <Search className="w-10 h-10 text-stone-300" />
                                </div>
                                <h2 className="text-xl font-bold text-deep-forest mb-2">
                                    No results found
                                </h2>
                                <p className="text-slate-500 max-w-md mb-8 text-sm">
                                    We couldn&apos;t find any items matching your exact filters. Adjust your choices or explore our featured products.
                                </p>

                                {/* Fallback Recommendations */}
                                {recommendedProducts.length > 0 && (
                                    <div className="w-full mt-8 pt-8 border-t border-stone-100">
                                        <h3 className="text-base font-bold text-deep-forest mb-6 text-left uppercase tracking-wider text-slate-400">Featured collection</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                                            {recommendedProducts.map(p => (
                                                <ProductCard
                                                    key={p.id}
                                                    product={{
                                                        id: p.id,
                                                        name: p.name,
                                                        slug: p.slug,
                                                        base_price: Number(p.base_price),
                                                        product_images: p.product_images || [],
                                                        product_variants: []
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </Suspense>
    );
}
