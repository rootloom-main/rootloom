import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/feeds/google-merchant', '/api/feed.xml'],
        disallow: ['/admin/', '/api/', '/account/', '/checkout/', '/sentry-test/'],
      },
      {
        userAgent: ['Googlebot', 'Googlebot-Image', 'Google-Extended'],
        allow: ['/', '/api/feeds/google-merchant', '/image-sitemap.xml', '/sitemap.xml'],
        disallow: ['/admin/', '/account/', '/checkout/'],
      },
    ],
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/image-sitemap.xml`,
    ],
  };
}
