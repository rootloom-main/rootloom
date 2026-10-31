'use client';

import React, { useState, useMemo } from 'react';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal, ArrowUpDown, X, Layers, Grid2X2, Grid3X3, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Product {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    description?: string;
    product_images: Array<{ image_url: string; alt_text: string | null }>;
    product_variants?: Array<{
        id: string;
        size: string;
        color: string;
        stock: number;
        price_adjustment: number;
    }>;
}

interface CollectionProductGridProps {
    products: Product[];
    collectionName: string;
}

export function CollectionProductGrid({ products = [], collectionName }: CollectionProductGridProps) {
    const [sortBy, setSortBy] = useState<string>('featured');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [gridCols, setGridCols] = useState<3 | 4>(4);

    // Filter & Sort
    const filteredProducts = useMemo(() => {
        let list = [...products];

        // 1. Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((p) => 
                p.name.toLowerCase().includes(q) || 
                (p.description && p.description.toLowerCase().includes(q))
            );
        }

        // 2. Sort
        switch (sortBy) {
            case 'price_low':
                list.sort((a, b) => a.base_price - b.base_price);
                break;
            case 'price_high':
                list.sort((a, b) => b.base_price - a.base_price);
                break;
            case 'name_asc':
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'featured':
            default:
                // keep original order
                break;
        }

        return list;
    }, [products, sortBy, searchQuery]);

    return (
        <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Filter & Sorting Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 mb-8 border-b border-stone-200">
                {/* Left: Product count & active query */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-stone-900 tracking-tight">
                        {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'}
                    </span>
                    {searchQuery.trim() && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-stone-100 text-stone-700">
                            <span>Filtering &quot;{searchQuery}&quot;</span>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="hover:text-black"
                                aria-label="Clear filter"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Search box & Sort selector */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* In-collection search */}
                    <div className="relative flex-1 sm:w-64 md:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                        <Input
                            type="text"
                            placeholder="Search in collection..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-8 h-10 text-xs sm:text-sm rounded-full border-stone-200 bg-stone-50/50 focus:bg-white transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                                aria-label="Clear search"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="w-44 sm:w-48">
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-10 text-xs sm:text-sm rounded-full border-stone-200 bg-white">
                                <div className="flex items-center gap-1.5 truncate">
                                    <ArrowUpDown className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                                    <SelectValue placeholder="Sort by" />
                                </div>
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="featured">Featured (Default)</SelectItem>
                                <SelectItem value="price_low">Price: Low to High</SelectItem>
                                <SelectItem value="price_high">Price: High to Low</SelectItem>
                                <SelectItem value="name_asc">Alphabetical: A-Z</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Grid view switcher (desktop) */}
                    <div className="hidden lg:flex items-center border border-stone-200 rounded-full p-1 bg-stone-50">
                        <button
                            onClick={() => setGridCols(3)}
                            className={`p-1.5 rounded-full transition-colors ${gridCols === 3 ? 'bg-white shadow-xs text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}
                            aria-label="3 columns"
                        >
                            <Grid2X2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setGridCols(4)}
                            className={`p-1.5 rounded-full transition-colors ${gridCols === 4 ? 'bg-white shadow-xs text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}
                            aria-label="4 columns"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {filteredProducts.length === 0 ? (
                <div className="py-20 px-6 text-center bg-stone-50 rounded-3xl border border-stone-200/60 max-w-xl mx-auto my-8">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-stone-400 border border-stone-100">
                        <Layers className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-900 mb-2">No matching items found</h3>
                    <p className="text-sm text-stone-500 mb-6">
                        {searchQuery
                            ? `We couldn't find any items matching "${searchQuery}" in this collection.`
                            : `This collection currently has no active products.`}
                    </p>
                    {searchQuery ? (
                        <Button
                            variant="outline"
                            onClick={() => setSearchQuery('')}
                            className="rounded-full px-6"
                        >
                            Clear Search
                        </Button>
                    ) : (
                        <Button asChild className="rounded-full px-8 bg-black hover:bg-stone-800 text-white">
                            <Link href="/shop">Browse All Products</Link>
                        </Button>
                    )}
                </div>
            ) : (
                /* Product Grid */
                <div
                    className={
                        gridCols === 3
                            ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
                            : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
                    }
                >
                    {filteredProducts.map((product, index) => (
                        <div key={product.id} className="transition-all duration-300">
                            <ProductCard product={product} priority={index < 4} />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
