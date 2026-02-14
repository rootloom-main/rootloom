'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Search, X, Loader2, Clock, TrendingUp, Star, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils/format';
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
}

const TRENDING_SEARCHES = [
    'Cotton Kurta',
    'Summer Dress',
    'Linen Shirt',
    'Tote Bag',
    'White Sneakers'
];

export function SmartSearch() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className="text-deep-forest font-bold bg-yellow-100 rounded-sm px-0.5">
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
        <div className="relative w-full max-w-xl mx-auto" ref={containerRef}>
            <form onSubmit={handleSearchSubmit} className="relative group">
                <div className={`relative flex items-center bg-slate-50 border transition-all duration-200 rounded-lg ${isOpen ? 'border-deep-forest ring-1 ring-deep-forest rounded-b-none border-b-0' : 'border-slate-200 hover:border-slate-300'}`}>
                    <Search className="absolute left-3.5 h-4 w-4 text-slate-400 group-focus-within:text-deep-forest transition-colors" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for products, brands and more"
                        className="pl-10 pr-10 h-11 w-full border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-slate-400"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <X className="h-4 w-4" />
                            )}
                        </button>
                    )}
                </div>
            </form>

            {/* Enhanced Results Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 bg-white rounded-b-lg shadow-xl border border-t-0 border-deep-forest/20 overflow-hidden z-50">

                    {/* State 1: Typing & Loading */}
                    {isLoading && (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4 animate-pulse">
                                    <div className="w-12 h-12 bg-slate-100 rounded-md" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* State 2: Results Found */}
                    {!isLoading && query.length > 0 && results.length > 0 && (
                        <div className="py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center bg-slate-50/50">
                                <span>Products</span>
                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{results.length} found</span>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {results.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/product/${product.slug}`}
                                        onClick={() => {
                                            addToRecentSearches(query);
                                            setIsOpen(false);
                                        }}
                                        className="flex items-start gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group border-b border-slate-50 last:border-none"
                                    >
                                        <div className="relative h-14 w-14 flex-shrink-0 rounded-md overflow-hidden bg-slate-100 border border-slate-100">
                                            <Image
                                                src={product.image_url || '/placeholder.jpg'}
                                                alt={product.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center h-14">
                                            <h4 className="text-sm font-medium text-deep-forest truncate group-hover:text-primary transition-colors">
                                                {highlightMatch(product.name, debouncedQuery)}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 rounded-sm truncate max-w-[120px]">
                                                    {product.category_name}
                                                </span>
                                                {product.average_rating > 0 && (
                                                    <div className="flex items-center gap-0.5 px-1.5 rounded-sm bg-green-50 text-[10px] font-medium text-green-700">
                                                        <span>{Number(product.average_rating).toFixed(1)}</span>
                                                        <Star className="h-2 w-2 fill-current" />
                                                        <span className="text-green-600/70 ml-0.5">({product.review_count})</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end justify-center h-14">
                                            <span className="text-sm font-bold text-deep-forest">
                                                {formatPrice(product.base_price)}
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <div className="bg-slate-50 border-t border-slate-100 p-2">
                                <Button
                                    variant="ghost"
                                    className="w-full text-sm text-primary hover:text-primary/90 h-9 font-medium hover:bg-white border border-transparent hover:border-slate-200 shadow-sm"
                                    onClick={() => {
                                        addToRecentSearches(query);
                                        // Navigation to search page would happen here
                                    }}
                                >
                                    View all results for "{query}"
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* State 3: No Results */}
                    {!isLoading && query.length > 0 && results.length === 0 && (
                        <div className="py-8 text-center">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-sm font-semibold text-deep-forest">No results for "{query}"</h3>
                            <p className="text-xs text-slate-500 mt-1 mb-4">Check for typos or try a broader search term</p>

                            <div className="px-8 text-left">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Try Searching</p>
                                <div className="flex flex-wrap gap-2">
                                    {TRENDING_SEARCHES.slice(0, 3).map(term => (
                                        <button
                                            key={term}
                                            onClick={() => handleSelectResult(term)}
                                            className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-1.5 rounded-full transition-colors text-slate-700"
                                        >
                                            {term}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* State 4: Initial Focused State (Recent + Trending) */}
                    {!query && (
                        <div className="py-2">
                            {/* Recent Searches */}
                            {recentSearches.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" /> Recent
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRecentSearches([]);
                                                localStorage.removeItem('recentSearches');
                                            }}
                                            className="text-[10px] text-primary hover:underline"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                    <div className="px-2">
                                        {recentSearches.map((term) => (
                                            <div
                                                key={term}
                                                onClick={() => handleSelectResult(term)}
                                                className="group flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors text-sm text-slate-700 hover:text-deep-forest"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Clock className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
                                                    <span>{term}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => removeRecentSearch(term, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded-full transition-all"
                                                >
                                                    <X className="h-3 w-3 text-slate-400" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Trending Searches */}
                            <div>
                                <div className="px-4 py-2">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <TrendingUp className="h-3 w-3" /> Trending
                                    </span>
                                </div>
                                <div className="px-2 pb-2">
                                    {TRENDING_SEARCHES.map((term, i) => (
                                        <div
                                            key={term}
                                            onClick={() => handleSelectResult(term)}
                                            className="group flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors text-sm text-slate-700 hover:text-deep-forest"
                                        >
                                            <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-300 bg-slate-50 rounded group-hover:bg-white group-hover:text-primary group-hover:shadow-sm transition-all border border-slate-100">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium">{term}</span>
                                            <TrendingUp className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 text-slate-300" />
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
