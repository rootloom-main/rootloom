'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, X, Loader2, Clock, TrendingUp, Star, ChevronRight, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import Image from 'next/image';
import Link from 'next/link';
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

export function SmartSearch() {
    return (
        <Suspense fallback={<div className="w-full h-12 bg-white/50 rounded-full animate-pulse" />}>
            <SmartSearchInner />
        </Suspense>
    );
}

function SmartSearchInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
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
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const [trendingSearches, setTrendingSearches] = useState<string[]>([
        'Linen Pants',
        'Cotton Pants',
        'Cotton Kurta',
        'Summer Dress',
        'Linen Shirt',
        'Tote Bag',
        'White Sneakers'
    ]);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);


    // Sync query with URL on search page
    useEffect(() => {
        if (pathname === '/search') {
            const q = searchParams?.get('q');
            if (q) setQuery(q);
        } else {
            setQuery('');
        }
    }, [pathname, searchParams]);

    // Load recent and trending searches
    useEffect(() => {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }

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
    }, []);

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

    // AbortController client query fetching
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
                        setIsOpen(false);
                    } else {
                        setResults(data.results || []);
                        setIsOpen(true);
                    }
                }
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('Search autocomplete error:', error);
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

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            setIsOpen(false);
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleSelectResult = (term: string, productId?: string) => {
        addToRecentSearches(term);
        localStorage.setItem('lastSearchQuery', term);
        setIsOpen(false);
        if (productId) {
            logClick(productId);
            const slug = results.find(r => r.id === productId)?.slug;
            if (slug) router.push(`/product/${slug}`);
        } else {
            router.push(`/search?q=${encodeURIComponent(term)}`);
        }
    };

    // Keyboard handlers
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        } else if (e.key === 'Enter') {
            if (focusedIndex >= 0 && focusedIndex < results.length) {
                e.preventDefault();
                const product = results[focusedIndex];
                handleSelectResult(product.name, product.id);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
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
                        <span key={i} className="text-deep-forest font-black bg-yellow-100/80 rounded px-0.5">
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
        <div
            className={cn(
                "relative z-50 transition-all duration-200 ease-in-out hidden md:block w-full"
            )}
            ref={containerRef}
        >
            <form onSubmit={handleSearchSubmit} className="relative group">
                <div
                    className={cn(
                        "relative flex items-center bg-stone-50/60 border transition-all duration-300 rounded-md pr-3 pl-3 h-10",
                        isFocused
                            ? "border-deep-forest bg-white shadow-sm ring-1 ring-deep-forest/10"
                            : "border-stone-200 hover:border-stone-300 hover:bg-stone-100/30",
                        isOpen && results.length > 0 && "rounded-b-none border-b-0 shadow-none bg-white"
                    )}
                >
                    <Search
                        className={cn(
                            "h-3.5 w-3.5 mr-2 transition-colors duration-200 flex-shrink-0",
                            isFocused ? "text-deep-forest" : "text-slate-400"
                        )}
                        strokeWidth={1.5}
                    />

                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder={ROTATING_PLACEHOLDERS[placeholderIndex]}
                        className="p-0 h-full w-full border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-xs placeholder:text-slate-400/80 rounded-none font-sans tracking-wide lowercase"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                            setFocusedIndex(-1);
                        }}
                        onFocus={() => {
                            setIsFocused(true);
                            setIsOpen(true);
                        }}
                        onBlur={() => {
                            setTimeout(() => setIsFocused(false), 200);
                        }}
                        onKeyDown={handleKeyDown}
                    />

                    <div className="flex items-center gap-1.5 ml-2">
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setResults([]);
                                    setIsOpen(false);
                                    inputRef.current?.focus();
                                }}
                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>
            </form>

            {/* Suggestions Overlay */}
            {isOpen && isFocused && (
                <div className="absolute top-10 left-0 right-0 bg-white rounded-b-md shadow-lg border-x border-b border-stone-200/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200 font-sans">
                    {/* State 1: Loading */}
                    {isLoading && (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4 animate-pulse">
                                    <div className="w-12 h-12 bg-slate-100 rounded-lg" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* State 2: Results Display */}
                    {!isLoading && query.length > 0 && results.length > 0 && (
                        <div>
                            <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>Suggested Products</span>
                                <Badge variant="outline" className="text-[10px] bg-white text-slate-500">{results.length} Matches</Badge>
                            </div>

                            <div className="max-h-[360px] overflow-y-auto">
                                {results.map((product, idx) => {
                                    const mrp = calculateMRP(product.base_price);
                                    const discount = calculateDiscountPercentage(product.base_price, mrp);
                                    const isOutOfStock = product.total_stock <= 0;
                                    const isLowStock = product.total_stock > 0 && product.total_stock < 5;

                                    return (
                                        <Link
                                            key={product.id}
                                            href={`/product/${product.slug}`}
                                            onClick={() => {
                                                logClick(product.id);
                                                addToRecentSearches(query);
                                                setIsOpen(false);
                                                setIsFocused(false);
                                            }}
                                            className={cn(
                                                "flex items-center gap-4 px-5 py-3 transition-colors border-b border-stone-50 last:border-none relative overflow-hidden group",
                                                focusedIndex === idx ? "bg-slate-50" : "hover:bg-slate-50/50"
                                            )}
                                        >
                                            {/* Left color bar on focus/hover */}
                                            <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-1 bg-deep-forest transition-opacity",
                                                focusedIndex === idx || "opacity-0 group-hover:opacity-100"
                                            )} />

                                            <div className="relative h-12 w-12 flex-shrink-0 rounded bg-stone-50 overflow-hidden border border-stone-200">
                                                <Image
                                                    src={product.image_url || 'https://images.unsplash.com/photo-1560769625-ed5974877ebc?w=500&h=500&fit=crop'}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-deep-forest truncate">
                                                    {highlightMatch(product.name, query)}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs">
                                                    <span className="text-stone-500">{product.category_name}</span>
                                                    <span>•</span>
                                                    {isOutOfStock ? (
                                                        <span className="text-red-500 font-bold">Out of stock</span>
                                                    ) : isLowStock ? (
                                                        <span className="text-amber-600 font-bold">Only {product.total_stock} left</span>
                                                    ) : (
                                                        <span className="text-green-600 font-medium">In Stock</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col pl-2">
                                                <span className="text-sm font-bold text-deep-forest">
                                                    {formatPrice(product.base_price)}
                                                </span>
                                                {discount > 0 && (
                                                    <span className="text-[10px] text-green-600 font-bold whitespace-nowrap bg-green-50 px-1 rounded self-end mt-0.5">
                                                        {discount}% OFF
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>

                            <div className="bg-stone-50 p-2 text-center border-t border-stone-100">
                                <Button
                                    variant="ghost"
                                    onClick={handleSearchSubmit}
                                    className="w-full text-xs font-bold text-deep-forest hover:bg-white hover:shadow-sm"
                                >
                                    VIEW ALL RESULTS <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* State 3: No Results */}
                    {!isLoading && query.length > 0 && results.length === 0 && (
                        <div className="p-8 text-center flex flex-col items-center">
                            <AlertCircle className="h-10 w-10 text-stone-300 mb-3" />
                            <h4 className="text-sm font-bold text-deep-forest mb-1">No products found</h4>
                            <p className="text-xs text-slate-500 max-w-xs mb-4">
                                We couldn&apos;t find matching results for &quot;{query}&quot;. Try spelling check or look up recommendations below.
                            </p>
                            <div className="w-full bg-stone-50 p-3 rounded-lg text-left">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Trending searches</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {trendingSearches.map(term => (
                                        <button
                                            key={term}
                                            onClick={() => handleSelectResult(term)}
                                            className="text-xs bg-white hover:border-deep-forest border border-stone-200 px-2.5 py-1 rounded transition-colors text-slate-600 hover:text-deep-forest"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* State 4: Default focus (Recent and Popular) */}
                    {!query && (
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-100">
                            {/* Recent Searches */}
                            <div className="p-3">
                                <div className="flex justify-between items-center px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Recent Searches</span>
                                    {recentSearches.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRecentSearches([]);
                                                localStorage.removeItem('recentSearches');
                                            }}
                                            className="text-[10px] text-primary hover:underline"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {recentSearches.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-slate-400 font-sans">
                                        No recent searches
                                    </div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {recentSearches.map(term => (
                                            <div
                                                key={term}
                                                className="group flex items-center justify-between px-3 py-1.5 hover:bg-stone-50 rounded-lg cursor-pointer text-sm text-slate-600 hover:text-deep-forest"
                                            >
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectResult(term); }}
                                                    className="flex items-center gap-2 flex-1 text-left"
                                                >
                                                    <Clock className="h-3 w-3 text-slate-300 group-hover:text-deep-forest" />
                                                    <span>{term}</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => removeRecentSearch(term, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 rounded-full transition-all text-slate-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Trending Searches */}
                            <div className="p-3 bg-stone-50/30">
                                <div className="px-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <TrendingUp className="h-3.5 w-3.5" /> Trending Now
                                </div>
                                <div className="space-y-0.5">
                                    {trendingSearches.map((term, i) => (
                                        <button
                                            type="button"
                                            key={term}
                                            onMouseDown={(e) => { e.preventDefault(); handleSelectResult(term); }}
                                            className="group w-full flex items-center gap-3 px-3 py-1.5 hover:bg-white hover:shadow-sm rounded-lg cursor-pointer text-sm text-slate-600 hover:text-deep-forest border border-transparent hover:border-stone-100"
                                        >
                                            <span className={cn(
                                                "w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded",
                                                i < 3 ? "bg-deep-forest text-white" : "bg-stone-200 text-slate-500"
                                            )}>
                                                {i + 1}
                                            </span>
                                            <span>{term}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
