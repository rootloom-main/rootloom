import { MetadataRoute } from 'next';
import { ProductService } from '@/lib/services/productService';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.in';

export const revalidate = 3600; // ISR cache 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    ProductService.getCategories(),
    ProductService.getProducts({ limit: 5000 }),
  ]);

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/collections`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Category routes
  const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map((cat: any) => ({
    url: `${BASE_URL}/shop?category=${cat.slug}`,
    lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // PDP Product routes with high freshness priority
  const productRoutes: MetadataRoute.Sitemap = (products || []).map((prod: any) => ({
    url: `${BASE_URL}/product/${prod.slug}`,
    lastModified: prod.updated_at ? new Date(prod.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
