'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Search, X, Loader2, ShoppingBag } from 'lucide-react';
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
}

export function SmartSearch() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setIsOpen(false);
            // Implement full search results page navigation if needed
            // router.push(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className="relative w-full max-w-md mx-auto" ref={containerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    type="text"
                    placeholder="Search for products, brands and more"
                    className="pl-10 pr-10 h-10 w-full bg-slate-50 border-slate-200 focus:border-deep-forest focus:ring-deep-forest transition-all"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length > 0) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0 || query.length > 0) setIsOpen(true);
                    }}
                />
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                    </button>
                )}
            </form>

            {/* Results Dropdown */}
            {isOpen && (query.length > 0) && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[70vh] overflow-y-auto shadow-xl border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Searching...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="py-2">
                            <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Products
                            </div>
                            {results.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/product/${product.slug}`}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-slate-100">
                                        <Image
                                            src={product.image_url || '/placeholder.jpg'}
                                            alt={product.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-deep-forest truncate group-hover:text-primary transition-colors">
                                            {product.name}
                                        </h4>
                                        <p className="text-xs text-slate-500 truncate">
                                            in {product.category_name}
                                        </p>
                                    </div>
                                    <div className="text-sm font-semibold text-deep-forest">
                                        {formatPrice(product.base_price)}
                                    </div>
                                </Link>
                            ))}
                            <div className="border-t border-slate-100 mt-2 pt-2 pb-1 px-2">
                                <Button variant="ghost" className="w-full text-xs text-primary h-8 hover:bg-transparent hover:underline">
                                    View all results for "{query}"
                                </Button>
                            </div>
                        </div>
                    ) : (debouncedQuery.length > 0 && !isLoading ? (
                        <div className="p-8 text-center text-slate-500">
                            <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Search className="h-5 w-5 opacity-40" />
                            </div>
                            <p className="text-sm font-medium text-slate-700">No results found</p>
                            <p className="text-xs mt-1">Try searching for "shirt", "blue", or "cotton"</p>
                        </div>
                    ) : null)}
                </Card>
            )}
        </div>
    );
}
