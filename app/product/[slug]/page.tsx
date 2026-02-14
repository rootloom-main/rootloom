import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductDetails } from './product-details';
import { Metadata } from 'next';
import { Reviews } from '@/components/product/reviews';
import { ProductSchema, BreadcrumbSchema } from '@/components/seo/structured-data';
import { getRelatedProducts } from '@/lib/data/recommendations';
import { RelatedProducts } from '@/components/product/related-products';

interface ProductPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, description, product_images(image_url)')
    .eq('slug', params.slug)
    .single();

  if (!product) {
    return {
      title: 'Product Not Found | Root&Loom',
    };
  }

  const imageUrl =
    product.product_images?.[0]?.image_url ||
    '/images/og-default.jpg'; // Fallback image

  return {
    title: `${product.name} | Root&Loom`,
    description: product.description || `Buy ${product.name} at Root&Loom`,
    openGraph: {
      title: product.name,
      description: product.description || `Buy ${product.name} at Root&Loom`,
      images: [{ url: imageUrl }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const supabase = await createClient();

  const [userResult, productResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
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
      .single(),
  ]);

  const {
    data: { user },
  } = userResult;
  const { data: product, error } = productResult;

  if (error || !product) {
    notFound();
  }

  // Fetch reviews, wishlist, and related products in parallel
  const [reviewsResult, wishlistResult, relatedProducts] = await Promise.all([
    supabase
      .from('reviews')
      .select(`
      *,
      profiles(full_name)
    `)
      .eq('product_id', product.id)
      .order('created_at', { ascending: false }),
    user
      ? supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()
      : Promise.resolve({ data: null }),
    getRelatedProducts(product.id, product.embedding),
  ]);

  const reviews = reviewsResult.data;
  const isWishlisted = !!wishlistResult.data;
  const hasStock = product.product_variants.some((v: any) => v.stock > 0);

  // Calculate Ratings
  const totalReviews = reviews?.length || 0;
  const averageRating =
    totalReviews > 0
      ? (reviews || []).reduce((acc: number, r: any) => acc + r.rating, 0) /
      totalReviews
      : 0;

  const siteUrl = 'https://rootloom.vercel.app';

  return (
    <div className="pb-16">
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: siteUrl },
          { name: 'Shop', item: `${siteUrl}/shop` },
          { name: product.category?.name || 'Category', item: `${siteUrl}/shop?category=${product.category?.slug}` },
          { name: product.name, item: `${siteUrl}/product/${product.slug}` },
        ]}
      />
      <ProductSchema
        product={{
          name: product.name,
          description: product.description,
          images: product.product_images.map((img: any) => img.image_url),
          brand: 'Root & Loom',
          sku: product.product_variants?.[0]?.sku || product.slug,
          offers: {
            price: product.base_price,
            priceCurrency: 'INR',
            availability: hasStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${siteUrl}/product/${product.slug}`,
          },
          aggregateRating: {
            ratingValue: parseFloat(averageRating.toFixed(1)),
            reviewCount: totalReviews,
          },
          reviews: reviews?.map((r: any) => ({
            author: r.profiles?.full_name || 'Anonymous',
            datePublished: r.created_at,
            reviewBody: r.comment || '',
            reviewRating: r.rating,
          })),
        }}
      />
      <ProductDetails product={product} isWishlisted={isWishlisted} />

      <div className="container mx-auto px-4">
        <RelatedProducts products={relatedProducts} />
        <Reviews productId={product.id} reviews={reviews || []} user={user} />
      </div>
    </div>
  );
}
