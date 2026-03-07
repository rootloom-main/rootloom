'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X, Clock, TrendingUp, ChevronRight, Loader2, ArrowLeft, PackageCheck, PackageX, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useDebounce } from '@/hooks/use-debounce';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type SearchResult = {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    base_price: number;
    category_name: string;
    average_rating: number;
    review_count: number;
    total_stock: number;
};

const TRENDING_SEARCHES = [
    'Linen Shirts',
    'Cotton Kurtas',
    'Sustainable Dresses',
    'White Sneakers'
];

import { Suspense } from 'react';

export function SearchOverlay() {
    return (
        <Suspense fallback={<Button variant="ghost" size="icon" className="h-8 w-8 text-deep-forest rounded-full md:hidden"><Search className="h-4 w-4" /></Button>}>
            <SearchOverlayInner />
        </Suspense>
    );
}

function SearchOverlayInner() {
    // ... existing content ...
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
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

    // Load recent searches
    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem('recentSearches');
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
            // Auto focus input
            setTimeout(() => inputRef.current?.focus(), 100);
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

    // Fetch results
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
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            addToRecentSearches(query.trim());
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleSelectResult = (term: string) => {
        addToRecentSearches(term);
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(term)}`);
    };

    // Helper to get stock status
    const getStockStatus = (stock: number) => {
        if (stock === 0) return { label: 'Out of Stock', color: 'text-red-500', icon: PackageX };
        if (stock < 5) return { label: `Only ${stock} left`, color: 'text-amber-500', icon: AlertTriangle };
        return { label: 'In Stock', color: 'text-green-600', icon: PackageCheck };
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
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-deep-forest hover:bg-stone-paper rounded-full md:hidden">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[100dvh] w-full p-0 border-none bg-white flex flex-col">
                <SheetTitle className="sr-only">Search</SheetTitle>

                {/* Header with Search Input */}
                <div className="flex items-center gap-2 p-4 border-b border-stone-100 bg-white sticky top-0 z-10">
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="-ml-2">
                            <ArrowLeft className="h-6 w-6 text-deep-forest" />
                        </Button>
                    </SheetClose>
                    <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search products..."
                            className="w-full bg-stone-50 border-none focus-visible:ring-1 focus-visible:ring-deep-forest/20 rounded-full pl-4 pr-10 h-11 text-base placeholder:text-slate-400"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('');
                                    setResults([]);
                                    inputRef.current?.focus();
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-200 rounded-full p-1"
                            >
                                <X className="h-3 w-3 text-slate-500" />
                            </button>
                        )}
                    </form>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-deep-forest/50" />
                        </div>
                    )}

                    {/* Results State */}
                    {!isLoading && query.length > 0 && results.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Results</h3>
                                <Badge variant="secondary" className="text-[10px]">{results.length} found</Badge>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {results.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/product/${product.slug}`}
                                        onClick={() => {
                                            addToRecentSearches(query);
                                            setOpen(false);
                                        }}
                                        className="flex gap-3 items-center p-2 rounded-lg hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100"
                                    >
                                        <div className="relative h-16 w-16 bg-stone-100 rounded-md overflow-hidden flex-shrink-0">
                                            <Image
                                                src={product.image_url || 'https://images.unsplash.com/photo-1560769625-ed5974877ebc?w=500&h=500&fit=crop'}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-deep-forest truncate">{product.name}</h4>
                                            <p className="text-sm text-slate-500 truncate">{product.category_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-deep-forest block">{formatPrice(product.base_price)}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <Button
                                onClick={handleSearchSubmit}
                                className="w-full bg-slate-50 text-deep-forest hover:bg-slate-100 border-none shadow-none mt-2"
                            >
                                See all results
                            </Button>
                        </div>
                    )}

                    {/* No Results State */}
                    {!isLoading && query.length > 0 && results.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-slate-500 mb-2">No results found for &quot;{query}&quot;</p>
                            <p className="text-xs text-slate-400">Try checking your spelling or use different keywords.</p>
                        </div>
                    )}

                    {/* Default State (Recent & Trending) */}
                    {!query && (
                        <div className="space-y-6">
                            {recentSearches.length > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" /> Recent
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
                                                onClick={() => handleSelectResult(term)}
                                                className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-full text-sm text-slate-600 border border-stone-100 active:scale-95 transition-transform"
                                            >
                                                <span>{term}</span>
                                                <button
                                                    onClick={(e) => removeRecentSearch(term, e)}
                                                    className="p-0.5 rounded-full bg-slate-200/50"
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
                                    {TRENDING_SEARCHES.map((term, i) => (
                                        <div
                                            key={term}
                                            onClick={() => handleSelectResult(term)}
                                            className="flex items-center justify-between py-3 px-2 border-b border-stone-50 last:border-none active:bg-stone-50"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className="w-5 h-5 flex items-center justify-center bg-stone-100 text-[10px] font-bold text-slate-500 rounded text-center">
                                                    {i + 1}
                                                </span>
                                                <span className="text-deep-forest font-medium">{term}</span>
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                        </div>
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
