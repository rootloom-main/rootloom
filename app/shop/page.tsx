import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { ShopContent } from './shop-content';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';

export const revalidate = 60; // Cache this route for 60 seconds

export const metadata: Metadata = {
  title: 'Shop All Products | Root&Loom',
  description: 'Explore our collection of premium clothing and accessories.',
};

import { ProductService } from '@/lib/services/productService';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const categories = await ProductService.getCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shop All Products</h1>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <ShopContent categories={categories || []} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
