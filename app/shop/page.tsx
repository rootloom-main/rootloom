import { Suspense } from 'react';
import { ShopContent } from './shop-content';
import { createClient } from '@/lib/supabase/server';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();

  const { data: categories } = await supabase.from('categories').select('*');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shop All Products</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ShopContent categories={categories || []} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
