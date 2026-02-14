import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { ShopContent } from './shop-content';
import { createClient } from '@/lib/supabase/server';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop All Products | Root&Loom',
  description: 'Explore our collection of premium clothing and accessories.',
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const getCategories = unstable_cache(
    async () => {
      const { data } = await supabase.from('categories').select('*');
      return data;
    },
    ['categories-list'],
    { revalidate: 3600 }
  );

  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shop All Products</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ShopContent categories={categories || []} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
