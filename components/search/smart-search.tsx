'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce'; // Fix hook import path if needed, usually just use-debounce or from hooks
import { Search, X, Loader2, Clock, TrendingUp, Star, ChevronRight, PackageX, PackageCheck, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

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

const TRENDING_SEARCHES = [
    'Cotton Kurta',
    'Summer Dress',
    'Linen Shirt',
    'Tote Bag',
    'White Sneakers'
];

import { Suspense } from 'react';

export function SmartSearch() {
    return (
        <Suspense fallback={<div className="w-full h-12 bg-white/50 rounded-full animate-pulse" />}>
            <SmartSearchInner />
        </Suspense>
    );
}

function SmartSearchInner() {
    // ... existing content ...
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false); // Track focus for expansion
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
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

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch results when debounced query changes
    useEffect(() => {
        const fetchResults = async () => {
            if (debouncedQuery.trim().length === 0) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
                const data = await res.json();
                setResults(data.results || []);
                setIsOpen(true);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            addToRecentSearches(query.trim());
            setIsOpen(false);
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleSelectResult = (term: string) => {
        setQuery(term);
        addToRecentSearches(term);
        setIsOpen(false);
        router.push(`/search?q=${encodeURIComponent(term)}`);
    };

    // Highlight matching text
    const highlightMatch = (text: string, highlight: string) => {
        if (!highlight.trim()) return text;
        const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    regex.test(part) ? (
                        <span key={i} className="text-deep-forest font-extrabold bg-yellow-100 rounded-sm px-0.5">
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
                "relative z-50 transition-all duration-300 ease-in-out mx-auto",
                isFocused ? "w-full max-w-3xl" : "w-full max-w-xl"
            )}
            ref={containerRef}
        >
            <form onSubmit={handleSearchSubmit} className="relative group">
                <div
                    className={cn(
                        "relative flex items-center bg-white border transition-all duration-300 rounded-full shadow-sm",
                        isFocused ? "shadow-xl border-deep-forest/50 ring-4 ring-deep-forest/5" : "border-stone-200 hover:border-stone-300 hover:shadow-md",
                        isOpen && "rounded-b-none border-b-0 shadow-none"
                    )}
                >
                    <Search className={cn(
                        "absolute left-4 h-5 w-5 transition-colors duration-200",
                        isFocused ? "text-deep-forest" : "text-slate-400"
                    )} />

                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for premium styles..."
                        className="pl-12 pr-12 h-12 w-full border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-slate-400/80 rounded-full"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => {
                            setIsFocused(true);
                            setIsOpen(true);
                        }}
                        onBlur={() => {
                            // Delay to allow clicking on results
                            setTimeout(() => setIsFocused(false), 200);
                        }}
                    />

                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200"
                            aria-label="Clear search"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-deep-forest" />
                            ) : (
                                <X className="h-4 w-4" />
                            )}
                        </button>
                    )}
                </div>
            </form>

            {/* Enhanced Results Dropdown - Animate Presence could be added here */}
            {isOpen && isFocused && (
                <div className="absolute top-12 left-0 right-0 bg-white rounded-b-2xl shadow-2xl border-x border-b border-deep-forest/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* ... (Existing logic for Loading, Results, No Results) ... */}
                    {/* (I'll keep the inner logic mostly the same but wrapping it in the new container style) */}

                    {/* State 1: Typing & Loading */}
                    {isLoading && (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4 animate-pulse">
                                    <div className="w-14 h-14 bg-slate-100 rounded-lg" />
                                    <div className="flex-1 space-y-2.5 py-1">
                                        <div className="h-4 bg-slate-100 rounded w-2/3" />
                                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* State 2: Results Found */}
                    {!isLoading && query.length > 0 && results.length > 0 && (
                        <div>
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Products</span>
                                <Badge variant="secondary" className="text-[10px] h-5 bg-white border border-slate-200 text-slate-600 shadow-sm">{results.length} matches</Badge>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {results.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/product/${product.slug}`}
                                        onClick={() => {
                                            addToRecentSearches(query);
                                            setIsOpen(false);
                                            setIsFocused(false);
                                        }}
                                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-none relative overflow-hidden"
                                    >
                                        {/* Hover highlight bar */}
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-deep-forest opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="relative h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                                            <Image
                                                src={product.image_url || 'https://images.unsplash.com/photo-1560769625-ed5974877ebc?w=500&h=500&fit=crop'}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                            <h4 className="text-sm font-semibold text-deep-forest truncate group-hover:text-primary transition-colors">
                                                {highlightMatch(product.name, debouncedQuery)}
                                            </h4>

                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[120px] font-medium border border-slate-200">
                                                    {product.category_name}
                                                </span>
                                                {product.average_rating > 0 && (
                                                    <div className="flex items-center gap-1 font-medium text-amber-600">
                                                        <Star className="h-3 w-3 fill-current" />
                                                        <span>{Number(product.average_rating).toFixed(1)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end justify-center self-center pl-2">
                                            <span className="text-sm font-bold text-deep-forest whitespace-nowrap">
                                                {formatPrice(product.base_price)}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <div className="bg-slate-50 border-t border-slate-100 p-2">
                                <Button
                                    variant="ghost"
                                    className="w-full text-sm text-deep-forest hover:text-deep-forest hover:bg-white border border-transparent hover:border-slate-200 shadow-none hover:shadow-sm font-medium transition-all"
                                    onClick={() => {
                                        addToRecentSearches(query);
                                        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                                    }}
                                >
                                    View all results <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* State 3: No Results */}
                    {!isLoading && query.length > 0 && results.length === 0 && (
                        <div className="py-12 px-6 text-center flex flex-col items-center">
                            <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mb-5 animate-in zoom-in-50 duration-300">
                                <Search className="h-8 w-8 text-stone-300" />
                            </div>
                            <h3 className="text-base font-bold text-deep-forest mb-1">No products found</h3>
                            <p className="text-sm text-slate-500 mb-6 max-w-xs">
                                We couldn&apos;t find matches for <span className="font-semibold text-deep-forest">&quot;{query}&quot;</span>.
                                <br />Try checking for typos or using general terms.
                            </p>

                            <div className="w-full text-left bg-slate-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Popular Suggestions</p>
                                <div className="flex flex-wrap gap-2">
                                    {TRENDING_SEARCHES.slice(0, 4).map(term => (
                                        <button
                                            key={term}
                                            onClick={() => handleSelectResult(term)}
                                            className="text-xs bg-white hover:bg-white hover:border-deep-forest/30 border border-slate-200 px-3 py-1.5 rounded-md transition-all text-slate-600 hover:text-deep-forest hover:shadow-sm"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* State 4: Initial Focus */}
                    {!query && (
                        // ... (similar to before but styled better)
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                            {/* Recent Searches Section */}
                            <div className="p-2">
                                <div className="px-3 py-2 flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" /> Recent
                                    </span>
                                    {recentSearches.length > 0 && (
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            setRecentSearches([]);
                                            localStorage.removeItem('recentSearches');
                                        }} className="text-[10px] text-primary font-medium hover:underline" aria-label="Clear all recent searches">
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {recentSearches.length === 0 ? (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-xs text-slate-400">No recent searches</p>
                                    </div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {recentSearches.map((term) => (
                                            <div
                                                key={term}
                                                onClick={() => handleSelectResult(term)}
                                                className="group flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-sm text-slate-600 hover:text-deep-forest"
                                            >
                                                <div className="flex items-center gap-3 w-full">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-deep-forest transition-colors" />
                                                    <span className="font-medium">{term}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => removeRecentSearch(term, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-full transition-all text-slate-400"
                                                    aria-label={`Remove ${term} from recent searches`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Trending Section */}
                            <div className="p-2 bg-slate-50/50">
                                <div className="px-3 py-2 mb-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <TrendingUp className="h-3.5 w-3.5" /> Trending Now
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {TRENDING_SEARCHES.map((term, i) => (
                                        <div
                                            key={term}
                                            onClick={() => handleSelectResult(term)}
                                            className="group flex items-center gap-3 px-3 py-2 hover:bg-white hover:shadow-sm rounded-lg cursor-pointer transition-all text-sm text-slate-600 hover:text-deep-forest border border-transparent hover:border-slate-100"
                                        >
                                            <span className={cn(
                                                "w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded-md transition-all",
                                                i < 3 ? "bg-deep-forest text-white" : "text-slate-400 bg-slate-200"
                                            )}>
                                                {i + 1}
                                            </span>
                                            <span className="font-medium">{term}</span>
                                        </div>
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
