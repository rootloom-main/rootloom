import { MetadataRoute } from 'next';
import { ProductService } from '@/lib/services/productService';

const baseUrl = 'https://rootloom.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    ProductService.getCategories(),
    ProductService.getProducts({ limit: 5000 })
  ]);

  const categoryUrls = categories.map((cat: any) => ({
    url: `${baseUrl}/shop?category=${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const productUrls = products.map((prod: any) => ({
    url: `${baseUrl}/product/${prod.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }));

  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
        url: `${baseUrl}/collections`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  return [...staticUrls, ...categoryUrls, ...productUrls];
}
