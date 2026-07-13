import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProductService } from '@/lib/services/productService';
import { ProductDetails } from './product-details';
import { Metadata } from 'next';
import { ProductSchema, BreadcrumbSchema } from '@/components/seo/structured-data';
import { getRelatedProducts } from '@/lib/data/recommendations';
import NextDynamic from 'next/dynamic';
import RecentlyViewed from '@/components/product/recently-viewed';

const Reviews = NextDynamic(() => import('@/components/product/reviews'), {
  loading: () => <div className="h-40 animate-pulse bg-stone-100 rounded-xl" />
});

const RelatedProducts = NextDynamic(() => import('@/components/product/related-products'), {
  loading: () => <div className="h-80 animate-pulse bg-stone-100 rounded-xl" />
});

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 900;

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from('products')
    .select('name, description, product_images(image_url)')
    .eq('slug', slug)
    .single() as { data: any | null };

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


import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Slash } from 'lucide-react';

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const product = await ProductService.getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [{ data: reviews }, relatedProducts] = await Promise.all([
    supabase
      .from('reviews')
      .select(`
      *,
      profiles(full_name)
    `)
      .eq('product_id', product.id)
      .order('created_at', { ascending: false }),
    getRelatedProducts(product.id, product.category_id || product.category?.id),
  ]);
  const hasStock = product.product_variants.some((v: any) => v.stock > 0);

  // Calculate Ratings
  const totalReviews = reviews?.length || 0;
  const averageRating =
    totalReviews > 0
      ? (reviews || []).reduce((acc: number, r: any) => acc + r.rating, 0) /
      totalReviews
      : 0;

  const siteUrl = 'https://rootloom.in';

  return (
    <div className="pb-16 bg-white">
      {/* SEO Schemas */}
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

      {/* Visual Breadcrumbs */}
      <div className="container mx-auto px-4 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><Slash className="w-3 h-3" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink href="/shop">Shop</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><Slash className="w-3 h-3" /></BreadcrumbSeparator>
            {product.category && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/shop?category=${product.category.slug}`}>{product.category.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator><Slash className="w-3 h-3" /></BreadcrumbSeparator>
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <ProductDetails
        product={product}
        isWishlisted={false}
        averageRating={averageRating}
        totalReviews={totalReviews}
      />

      <div className="container mx-auto px-4">
        <RelatedProducts products={relatedProducts} />
        <RecentlyViewed currentProductId={product.id} />
        <Reviews productId={product.id} reviews={reviews || []} user={null} />
      </div>
    </div>
  );
}
