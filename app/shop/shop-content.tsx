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
import { formatPrice } from '@/lib/utils/format';
import { Loader2, SlidersHorizontal, X, Check } from 'lucide-react';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { getFilteredProducts } from '@/lib/actions/product';

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

  // Pending filter state in the sheet (not applied yet)
  const [sheetCategory, setSheetCategory] = useState(selectedCategory);
  const [sheetPriceRange, setSheetPriceRange] = useState(priceRange);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    setSearch(params?.get('search') || '');
    setSelectedCategory(params?.get('category') || 'all');
    setSortBy(params?.get('sort') || 'latest');
  }, [params]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        limit: 50,
      });
      if (result.success) {
        setProducts(result.products as Product[]);
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
    if (value) current.set(key, value);
    else current.delete(key);
    const searchStr = current.toString();
    startTransition(() => router.push(`/shop${searchStr ? '?' + searchStr : ''}`));
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateURL('category', category === 'all' ? '' : category);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    updateURL('sort', sort);
  };

  const handleApplyFilters = () => {
    setSelectedCategory(sheetCategory);
    setPriceRange(sheetPriceRange);
    updateURL('category', sheetCategory === 'all' ? '' : sheetCategory);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setSheetCategory('all');
    setSheetPriceRange([0, 20000]);
  };

  const handleClearAll = () => {
    setSelectedCategory('all');
    setPriceRange([0, 20000]);
    setSortBy('latest');
    router.push('/shop');
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedCategory !== 'all' ||
    priceRange[0] > 0 ||
    priceRange[1] < 20000;

  const allCategories = [{ id: 'all', name: 'All', slug: 'all' }, ...categories];

  const renderSheetFilters = () => (
    <div className="space-y-8 px-1">
      <div>
        <h3 className="font-semibold mb-4 text-deep-forest text-sm uppercase tracking-widest">Category</h3>
        <RadioGroup value={sheetCategory} onValueChange={setSheetCategory}>
          <div className="flex items-center space-x-3 mb-3">
            <RadioGroupItem value="all" id="sheet-all" className="w-5 h-5" />
            <Label htmlFor="sheet-all" className="cursor-pointer text-base">All Products</Label>
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-3 mb-3">
              <RadioGroupItem value={category.slug} id={`sheet-${category.slug}`} className="w-5 h-5" />
              <Label htmlFor={`sheet-${category.slug}`} className="cursor-pointer text-base">{category.name}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <h3 className="font-semibold mb-4 text-sm uppercase tracking-widest">Price Range</h3>
        <div className="space-y-4">
          <Slider
            value={sheetPriceRange}
            onValueChange={setSheetPriceRange}
            max={20000}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-sm font-medium text-stone-700">
            <span className="bg-stone-100 px-3 py-1 rounded-full">{formatPrice(sheetPriceRange[0])}</span>
            <span className="bg-stone-100 px-3 py-1 rounded-full">{formatPrice(sheetPriceRange[1])}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop sidebar filters
  const renderDesktopFilters = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4 text-deep-forest text-xs uppercase tracking-widest">Category</h3>
        <RadioGroup value={selectedCategory} onValueChange={handleCategoryChange} disabled={loading}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="all" id="desktop-all" disabled={loading} />
            <Label htmlFor="desktop-all" className={cn('cursor-pointer text-slate-bark', loading && 'opacity-50 cursor-not-allowed')}>All Products</Label>
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value={category.slug} id={`desktop-${category.slug}`} disabled={loading} />
              <Label htmlFor={`desktop-${category.slug}`} className={cn('cursor-pointer', loading && 'opacity-50 cursor-not-allowed')}>{category.name}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div>
        <h3 className="font-semibold mb-4 text-xs uppercase tracking-widest">Price Range</h3>
        <div className={cn('space-y-4', loading && 'opacity-50 pointer-events-none')}>
          <Slider value={priceRange} onValueChange={setPriceRange} max={20000} step={100} className="w-full" disabled={loading} />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatPrice(priceRange[0])}</span>
            <span>{formatPrice(priceRange[1])}</span>
          </div>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={handleClearAll} disabled={loading}>Clear Filters</Button>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="sticky top-24 space-y-6">{renderDesktopFilters()}</div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile: Horizontal Category Pills */}
        <div className="md:hidden mb-4 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {allCategories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all',
                  selectedCategory === cat.slug
                    ? 'bg-deep-forest text-white border-deep-forest'
                    : 'bg-white text-stone-600 border-stone-200 active:bg-stone-50'
                )}
                style={{ minHeight: 44, whiteSpace: 'nowrap' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar: count + sort + filter */}
        <div className="flex justify-between items-center mb-5 gap-3">
          <p className="text-sm text-slate-bark font-medium">
            {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
            {hasActiveFilters && (
              <button onClick={handleClearAll} className="ml-2 text-xs text-raw-clay underline font-normal">clear</button>
            )}
          </p>

          <div className="flex gap-2 items-center">
            {/* Sort */}
            <Select value={sortBy} onValueChange={handleSortChange} disabled={loading}>
              <SelectTrigger className="h-10 text-sm w-[140px] sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="price-asc">Price: Low → High</SelectItem>
                <SelectItem value="price-desc">Price: High → Low</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>

            {/* Mobile filter button */}
            <Sheet open={isFilterOpen} onOpenChange={(open) => {
              if (open) {
                // Sync sheet state with applied state when opening
                setSheetCategory(selectedCategory);
                setSheetPriceRange(priceRange);
              }
              setIsFilterOpen(open);
            }}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'md:hidden h-10 px-3 gap-1.5 text-sm font-semibold',
                    hasActiveFilters && 'border-deep-forest text-deep-forest bg-deep-forest/5'
                  )}
                  aria-label="Open filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filter</span>
                  {hasActiveFilters && (
                    <span className="w-4 h-4 bg-raw-clay text-white text-[10px] rounded-full flex items-center justify-center">
                      !
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl flex flex-col">
                <SheetHeader className="border-b border-stone-100 pb-3 mb-4">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-deep-forest text-lg">Filters</SheetTitle>
                    <button onClick={handleResetFilters} className="text-sm text-raw-clay font-semibold">Reset All</button>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  {renderSheetFilters()}
                </div>
                <SheetFooter className="pt-4 border-t border-stone-100 mt-4">
                  <Button
                    onClick={handleApplyFilters}
                    className="w-full h-14 bg-deep-forest text-white text-base font-bold rounded-xl"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Apply Filters
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Product Grid */}
        {isInitialLoad && loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 && !loading ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-xl font-serif text-deep-forest">No products found</p>
            <p className="text-stone-500 text-sm">Try adjusting your filters or search term</p>
            <Button onClick={handleClearAll} className="bg-deep-forest text-heirloom-white hover:bg-oxide-brown mt-4">
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 transition-opacity duration-300 relative',
              !isInitialLoad && (loading || isPending) ? 'opacity-50 pointer-events-none' : 'opacity-100'
            )}
          >
            {!isInitialLoad && (loading || isPending) && (
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
