'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, Clock, TrendingUp, ChevronRight, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useDebounce } from '@/hooks/use-debounce';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { calculateMRP, calculateDiscountPercentage } from '@/lib/utils/pricing';

interface SearchResult {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    base_price: number;
    category_name: string;
    average_rating: number;
    review_count: number;
    total_stock: number;
}

const SpeechRecognition = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;

const ROTATING_PLACEHOLDERS = [
    'find "linen pants"...',
    'find "cotton trousers"...',
    'find "pure linen shirts"...',
    'find "cotton kurtas"...',
    'find "oversized tees"...',
    'find "summer dresses"...'
];

export function SearchOverlay() {
    return (
        <Suspense fallback={
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-deep-forest hover:bg-stone-paper rounded-full lg:hidden">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
        }>
            <SearchOverlayInner />
        </Suspense>
    );
}

function SearchOverlayInner() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 250); // 250ms Debounce
    const [placeholderIndex, setPlaceholderIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PLACEHOLDERS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    const [trendingSearches, setTrendingSearches] = useState<string[]>([
        'Linen Pants',
        'Cotton Pants',
        'Linen Shirts',
        'Cotton Kurtas',
        'Sustainable Dresses',
        'White Sneakers'
    ]);

    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const inputRef = useRef<HTMLInputElement>(null);


    // Sync query with URL
    useEffect(() => {
        if (pathname === '/search') {
            const q = searchParams?.get('q');
            if (q) setQuery(q);
        } else {
            setQuery('');
        }
    }, [pathname, searchParams]);

    // Load recent searches and trending searches
    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem('recentSearches');
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
            setTimeout(() => inputRef.current?.focus(), 100);

            // Fetch custom trending searches from database search configuration
            const fetchTrendingConfig = async () => {
                try {
                    const { createClient } = await import('@/lib/supabase/client');
                    const supabase = createClient() as any;
                    const { data } = await supabase
                        .from('search_configs')
                        .select('value')
                        .eq('key', 'trending_searches')
                        .maybeSingle() as any;

                    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
                        setTrendingSearches(data.value);
                    }
                } catch (err) {
                    console.error('Error fetching trending searches config:', err);
                }
            };
            fetchTrendingConfig();
        }
    }, [open]);

    const addToRecentSearches = (term: string) => {
        if (!term.trim()) return;
        const newSearches = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(newSearches);
        localStorage.setItem('recentSearches', JSON.stringify(newSearches));
    };

    const removeRecentSearch = (term: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSearches = recentSearches.filter(s => s !== term);
        setRecentSearches(newSearches);
        localStorage.setItem('recentSearches', JSON.stringify(newSearches));
    };

    // Autocomplete suggestion fetch with AbortController
    useEffect(() => {
        if (debouncedQuery.trim().length === 0) {
            setResults([]);
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`, { signal });
                const data = await res.json();
                if (!signal.aborted) {
                    if (data.redirect) {
                        router.push(data.redirect);
                        setOpen(false);
                    } else {
                        setResults(data.results || []);
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('Search error:', error);
                }
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchResults();

        return () => {
            controller.abort();
        };
    }, [debouncedQuery, router]);

    const logClick = async (productId: string) => {
        try {
            await fetch('/api/search/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query.trim(),
                    productId
                })
            });
        } catch (e) {
            console.error('Search click log error:', e);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            addToRecentSearches(query.trim());
            localStorage.setItem('lastSearchQuery', query.trim());
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleSelectResult = (term: string, productId?: string) => {
        addToRecentSearches(term);
        localStorage.setItem('lastSearchQuery', term);
        setOpen(false);
        if (productId) {
            logClick(productId);
            const slug = results.find(r => r.id === productId)?.slug;
            if (slug) router.push(`/product/${slug}`);
        } else {
            router.push(`/search?q=${encodeURIComponent(term)}`);
        }
    };



    const highlightMatch = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    regex.test(part) ? (
                        <span key={i} className="text-deep-forest font-black bg-yellow-100 px-0.5 rounded">
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-deep-forest hover:bg-stone-paper rounded-full lg:hidden">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[100dvh] w-full p-0 border-none bg-white flex flex-col font-sans">
                <SheetTitle className="sr-only">Search</SheetTitle>

                {/* Sticky Header with Large Input */}
                <div className="flex items-center gap-2 p-3 border-b border-stone-100 bg-white sticky top-0 z-10">
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="-ml-1">
                            <ArrowLeft className="h-6 w-6 text-deep-forest" />
                        </Button>
                    </SheetClose>
                    <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 flex-shrink-0" strokeWidth={1.5} />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={ROTATING_PLACEHOLDERS[placeholderIndex]}
                            className="w-full bg-stone-50/80 border border-stone-200/60 focus-visible:ring-1 focus-visible:ring-deep-forest/15 rounded-md pl-9 pr-8 h-10 text-xs placeholder:text-slate-400 font-sans tracking-wide lowercase"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setResults([]);
                                    inputRef.current?.focus();
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </form>
                </div>

                {/* Results and History Panels */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Standard Loading */}
                    {isLoading && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-deep-forest/50" />
                        </div>
                    )}

                    {/* Autocomplete suggestions display */}
                    {!isLoading && query.length > 0 && results.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Matches</h3>
                                <Badge variant="secondary" className="text-[10px]">{results.length} results</Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {results.map((product) => {
                                    const mrp = calculateMRP(product.base_price);
                                    const discount = calculateDiscountPercentage(product.base_price, mrp);
                                    const isOutOfStock = product.total_stock <= 0;

                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/product/${product.slug}`}
                                            onClick={() => {
                                                logClick(product.id);
                                                addToRecentSearches(query);
                                                setOpen(false);
                                            }}
                                            className="flex gap-3 items-center p-2 rounded-lg bg-white border border-stone-100 shadow-sm active:bg-stone-50"
                                        >
                                            <div className="relative h-14 w-14 bg-stone-50 rounded overflow-hidden flex-shrink-0 border border-stone-200">
                                                <Image
                                                    src={product.image_url || 'https://images.unsplash.com/photo-1560769625-ed5974877ebc?w=500&h=500&fit=crop'}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-deep-forest truncate">
                                                    {highlightMatch(product.name, query)}
                                                </h4>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                                                    <span>{product.category_name}</span>
                                                    <span>•</span>
                                                    {isOutOfStock ? (
                                                        <span className="text-red-500 font-bold">Out of stock</span>
                                                    ) : (
                                                        <span className="text-green-600 font-medium">In Stock</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col">
                                                <span className="font-bold text-sm text-deep-forest">{formatPrice(product.base_price)}</span>
                                                {discount > 0 && (
                                                    <span className="text-[9px] text-green-600 font-bold mt-0.5">
                                                        {discount}% OFF
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                            <Button
                                onClick={handleSearchSubmit}
                                className="w-full bg-deep-forest text-white hover:bg-deep-forest/90 h-11 rounded-full mt-4 font-bold"
                            >
                                SEE ALL RESULTS
                            </Button>
                        </div>
                    )}

                    {/* No matches */}
                    {!isLoading && query.length > 0 && results.length === 0 && (
                        <div className="text-center py-12 flex flex-col items-center">
                            <AlertCircle className="h-10 w-10 text-stone-300 mb-3" />
                            <p className="text-deep-forest font-bold mb-1">No products found</p>
                            <p className="text-xs text-slate-500 max-w-xs">We couldn&apos;t find matching results for &quot;{query}&quot;. Try spelling check or look up recommendations.</p>
                        </div>
                    )}

                    {/* Landing State: History & Trending */}
                    {!query && (
                        <div className="space-y-6">
                            {recentSearches.length > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" /> Recent Searches
                                        </h3>
                                        <button
                                            onClick={() => {
                                                setRecentSearches([]);
                                                localStorage.removeItem('recentSearches');
                                            }}
                                            className="text-xs text-primary font-medium p-1"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {recentSearches.map(term => (
                                            <div
                                                key={term}
                                                className="flex items-center gap-2 bg-stone-50 border border-stone-200/50 px-3.5 py-1.5 rounded-full text-sm text-slate-600 active:scale-95 transition-transform"
                                            >
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectResult(term); }}
                                                    className="text-left"
                                                >
                                                    {term}
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => removeRecentSearch(term, e)}
                                                    className="p-0.5 rounded-full bg-slate-200"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <TrendingUp className="h-3.5 w-3.5" /> Trending Now
                                </h3>
                                <div className="space-y-1">
                                    {trendingSearches.map((term, i) => (
                                        <button
                                            type="button"
                                            key={term}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectResult(term); }}
                                            className="w-full flex items-center justify-between py-3.5 px-3 border-b border-stone-50 last:border-none active:bg-stone-50 rounded-lg transition-colors"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className={cn(
                                                    "w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded",
                                                    i < 3 ? "bg-deep-forest text-white" : "bg-stone-100 text-slate-500"
                                                )}>
                                                    {i + 1}
                                                </span>
                                                <span className="text-deep-forest font-medium text-sm">{term}</span>
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
