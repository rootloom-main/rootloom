import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { ShopContent } from './shop-content';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';
import { ProductGridSkeleton } from '@/components/product/product-skeleton';

export const revalidate = 60; // Cache this route for 60 seconds

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const category = (searchParams.category as string) || null;
  const title = category 
    ? `${category.charAt(0).toUpperCase() + category.slice(1)} Streetwear & Aesthetic Clothing | Root & Loom`
    : 'Shop All Aesthetic Streetwear & Drops | Root & Loom';
  
  const description = category
    ? `Explore our latest collection of ${category}'s streetwear. Premium drip, oversized fits, and ethical fashion for the ${category} collection.`
    : 'Explore the latest sustainable fashion and Gen Z streetwear drops. Premium quality ethical drip for your aesthetic journey.';

  return {
    title,
    description,
    alternates: {
      canonical: category ? `https://rootloom.in/shop?category=${category}` : 'https://rootloom.in/shop',
    },
  };
}

import { ProductService } from '@/lib/services/productService';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const categories = await ProductService.getCategories();
  const category = (searchParams.category as string) || null;
  const heading = category 
    ? `${category.charAt(0).toUpperCase() + category.slice(1)}'s Streetwear Collection`
    : 'All Streetwear & Drops';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-5xl font-black mb-8 uppercase tracking-tighter italic text-deep-forest">
        {heading}
      </h1>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <ShopContent categories={categories || []} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
