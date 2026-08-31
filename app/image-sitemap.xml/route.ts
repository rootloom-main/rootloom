import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.in';

  const { data: products } = await supabase
    .from('products')
    .select(`
      slug,
      name,
      description,
      product_images(image_url, alt_text)
    `)
    .eq('status', 'active')
    .is('deleted_at', null);

  const urlEntries = (products || [])
    .map((product: any) => {
      const pageUrl = `${siteUrl}/product/${product.slug}`;
      const images = (product.product_images || [])
        .map((img: any) => {
          const fullImgUrl = img.image_url.startsWith('http')
            ? img.image_url
            : `${siteUrl}${img.image_url.startsWith('/') ? '' : '/'}${img.image_url}`;
          const title = escapeXml(img.alt_text || `${product.name} - Root & Loom`);
          const caption = escapeXml(
            `${product.name} | Sustainable Luxury Streetwear India`
          );

          return `
      <image:image>
        <image:loc>${escapeXml(fullImgUrl)}</image:loc>
        <image:title>${title}</image:title>
        <image:caption>${caption}</image:caption>
        <image:geo_location>Ahmedabad, Gujarat, India</image:geo_location>
      </image:image>`;
        })
        .join('');

      if (!images) return '';

      return `
    <url>
      <loc>${escapeXml(pageUrl)}</loc>${images}
    </url>`;
    })
    .filter(Boolean)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
