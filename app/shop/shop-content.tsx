'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils/format';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';
import { cn } from '@/lib/utils'; // Included cn
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  product_images: Array<{ image_url: string; alt_text: string | null }>;
  product_variants: Array<{
    id: string;
    size: string;
    color: string;
    stock: number;
    price_adjustment: number;
  }>;
}

import { getFilteredProducts } from '@/lib/actions/product';

export function ShopContent({
  categories,
  searchParams,
}: {
  categories: Category[];
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [isPending, startTransition] = React.useTransition();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    (params?.get('category') as string) || 'all'
  );
  const [sortBy, setSortBy] = useState<string>(params?.get('sort') || 'latest');
  const [search, setSearch] = useState<string>(params?.get('search') || '');

  useEffect(() => {
    setSearch(params?.get('search') || '');
    setSelectedCategory(params?.get('category') || 'all');
    setSortBy(params?.get('sort') || 'latest');
  }, [params]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy, priceRange, search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const result = await getFilteredProducts({
        categorySlug: selectedCategory,
        search,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        sortBy,
        limit: 50
      });

      if (result.success) {
        setProducts(result.products as Product[]);
      } else {
        console.error('Failed to fetch filtered products:', result.error);
      }
    } catch (error) {
      console.error('Error in fetchProducts:', error);
    } finally {
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  };

  const updateURL = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(params?.entries() || []));
    if (value) {
      current.set(key, value);
    } else {
      current.delete(key);
    }
    const searchStr = current.toString();
    const query = searchStr ? `?${searchStr}` : '';
    startTransition(() => {
      router.push(`/shop${query}`);
    });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateURL('category', category === 'all' ? '' : category);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    updateURL('sort', sort);
  };

  const renderFilters = (idPrefix: string) => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4 text-deep-forest">Category</h3>
        <RadioGroup value={selectedCategory} onValueChange={handleCategoryChange} disabled={loading}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="all" id={`${idPrefix}-all`} disabled={loading} />
            <Label htmlFor={`${idPrefix}-all`} className={cn("cursor-pointer text-slate-bark", loading && "opacity-50 cursor-not-allowed")}>
              All Products
            </Label>
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value={category.slug} id={`${idPrefix}-${category.slug}`} disabled={loading} />
              <Label htmlFor={`${idPrefix}-${category.slug}`} className={cn("cursor-pointer", loading && "opacity-50 cursor-not-allowed")}>
                {category.name}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Price Range</h3>
        <div className={cn("space-y-4", loading && "opacity-50 pointer-events-none")}>
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={20000}
            step={100}
            className="w-full"
            disabled={loading}
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatPrice(priceRange[0])}</span>
            <span>{formatPrice(priceRange[1])}</span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setSelectedCategory('all');
          setPriceRange([0, 20000]);
          setSortBy('latest');
          router.push('/shop');
        }}
        disabled={loading}
      >
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="grid md:grid-cols-4 gap-8">
      <aside className="hidden md:block">
        <div className="sticky top-24 space-y-6">
          {renderFilters('desktop')}
        </div>
      </aside>

      <div className="md:col-span-3">
        <div className="flex justify-between items-center mb-6">
          <p className="text-slate-bark">
            {loading ? 'Loading...' : `${products.length} products found`}
          </p>
          <div className="flex gap-2 items-center">
            <Select value={sortBy} onValueChange={handleSortChange} disabled={loading}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle className="text-deep-forest">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  {renderFilters('mobile')}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {isInitialLoad && loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 && !loading ? (
          <div className="text-center py-16">
            <p className="text-slate-bark mb-4">No products found matching your criteria.</p>
            <Button
              onClick={() => {
                setSelectedCategory('all');
                setPriceRange([0, 20000]);
                router.push('/shop');
              }}
              className="bg-deep-forest text-heirloom-white hover:bg-oxide-brown"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className={cn("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 relative", (!isInitialLoad && (loading || isPending)) ? "opacity-50 pointer-events-none" : "opacity-100")}>
            {(!isInitialLoad && (loading || isPending)) && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-deep-forest" />
              </div>
            )}
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 8} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
