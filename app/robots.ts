import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/', '/account/', '/checkout/', '/sentry-test/'],
        },
        sitemap: 'https://rootloom.in/sitemap.xml',
    };
}
