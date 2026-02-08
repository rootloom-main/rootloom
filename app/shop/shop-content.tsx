'use client';

import { useState, useEffect } from 'react';
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
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    (params.get('category') as string) || 'all'
  );
  const [sortBy, setSortBy] = useState<string>(params.get('sort') || 'latest');
  const [search, setSearch] = useState<string>(params.get('search') || '');

  useEffect(() => {
    setSearch(params.get('search') || '');
  }, [params]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy, priceRange, search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('id, name, slug, base_price, product_images(image_url, alt_text)');

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (selectedCategory && selectedCategory !== 'all') {
        const category = categories.find((c) => c.slug === selectedCategory);
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      query = query.gte('base_price', priceRange[0]).lte('base_price', priceRange[1]);

      switch (sortBy) {
        case 'price-asc':
          query = query.order('base_price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('base_price', { ascending: false });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateURL = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(params.entries()));
    if (value) {
      current.set(key, value);
    } else {
      current.delete(key);
    }
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/shop${query}`);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateURL('category', category === 'all' ? '' : category);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    updateURL('sort', sort);
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4 text-deep-forest">Category</h3>
        <RadioGroup value={selectedCategory} onValueChange={handleCategoryChange}>
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="cursor-pointer text-slate-bark">
              All Products
            </Label>
          </div>
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value={category.slug} id={category.slug} />
              <Label htmlFor={category.slug} className="cursor-pointer">
                {category.name}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Price Range</h3>
        <div className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={5000}
            step={100}
            className="w-full"
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
          setPriceRange([0, 5000]);
          setSortBy('latest');
          router.push('/shop');
        }}
      >
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="grid md:grid-cols-4 gap-8">
      <aside className="hidden md:block">
        <div className="sticky top-24 space-y-6">
          <FiltersContent />
        </div>
      </aside>

      <div className="md:col-span-3">
        <div className="flex justify-between items-center mb-6">
          <p className="text-slate-bark">
            {loading ? 'Loading...' : `${products.length} products found`}
          </p>
          <div className="flex gap-2 items-center">
            <Select value={sortBy} onValueChange={handleSortChange}>
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
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-deep-forest" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-bark mb-4">No products found matching your criteria.</p>
            <Button
              onClick={() => {
                setSelectedCategory('all');
                setPriceRange([0, 5000]);
                router.push('/shop');
              }}
              className="bg-deep-forest text-heirloom-white hover:bg-oxide-brown"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
