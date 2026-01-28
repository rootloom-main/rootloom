import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductDetails } from './product-details';

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:categories(name, slug),
      product_images(id, image_url, alt_text, display_order),
      product_variants(id, size, color, stock, price_adjustment, sku)
    `
    )
    .eq('slug', params.slug)
    .single();

  if (error || !product) {
    notFound();
  }

  return <ProductDetails product={product} />;
}
