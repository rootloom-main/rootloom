import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.vercel.app';

    // Fetch active products with variants
    const { data: products } = await supabase
        .from('products')
        .select(`
            id,
            name,
            slug,
            description,
            base_price,
            product_images (image_url),
            product_variants (sku, stock),
            categories (name)
        `)
        .eq('status', 'active');

    if (!products) {
        return new NextResponse('<error>Failed to fetch products</error>', { status: 500, headers: { 'Content-Type': 'text/xml' } });
    }

    // Build XML RSS Feed based on Google Merchant Center specifications
    const itemsXml = products.map((product: any) => {
        const url = `${siteUrl}/product/${product.slug}`;
        const imageUrl = product.product_images?.[0]?.image_url || `${siteUrl}/placeholder.png`;
        const sku = product.product_variants?.[0]?.sku || product.id;
        const stock = product.product_variants?.reduce((acc: number, v: any) => acc + (v.stock || 0), 0) || 0;
        const availability = stock > 0 ? 'in_stock' : 'out_of_stock';

        // Ensure description is plain text and escaped
        const cleanDescription = (product.description || '')
            .replace(/<[^>]*>?/gm, '') // Remove HTML tags
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        return `
    <item>
      <g:id>${sku}</g:id>
      <g:title>${product.name.replace(/&/g, '&amp;')}</g:title>
      <g:description>${cleanDescription}</g:description>
      <g:link>${url}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${product.base_price} INR</g:price>
      <g:brand>Root &amp; Loom</g:brand>
      ${product.categories?.name ? `<g:product_type>${product.categories.name.replace(/&/g, '&amp;')}</g:product_type>` : ''}
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Root &amp; Loom Shop</title>
    <link>${siteUrl}</link>
    <description>Premium heirloom quality home decor and furnishings.</description>
${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            // Cache for 1 hour to prevent excessive DB hits
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
