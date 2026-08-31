import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanDescription(desc: string | null | undefined): string {
  if (!desc) return 'Root &amp; Loom Sustainable Handcrafted Streetwear.';
  const stripped = desc.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  return escapeXml(stripped.slice(0, 5000));
}

export async function GET() {
  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.in';

  // Fetch active products with nested category, images, and variants
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      base_price,
      metadata,
      category:categories(name, slug),
      product_images(image_url, alt_text, display_order),
      product_variants(id, sku, size, color, stock, price_adjustment)
    `)
    .eq('status', 'active')
    .is('deleted_at', null);

  if (error || !products) {
    return new NextResponse('<error>Failed to fetch products</error>', {
      status: 500,
      headers: { 'Content-Type': 'application/xml' },
    });
  }

  const itemsXml: string[] = [];

  for (const product of products as any[]) {
    const variants = product.product_variants || [];
    const images = (product.product_images || []).sort(
      (a: any, b: any) => (a.display_order || 0) - (b.display_order || 0)
    );

    const primaryImgUrl = images[0]?.image_url
      ? images[0].image_url.startsWith('http')
        ? images[0].image_url
        : `${siteUrl}${images[0].image_url.startsWith('/') ? '' : '/'}${images[0].image_url}`
      : `${siteUrl}/placeholder.png`;

    const additionalImagesXml = images
      .slice(1, 10)
      .map((img: any) => {
        const fullUrl = img.image_url.startsWith('http')
          ? img.image_url
          : `${siteUrl}${img.image_url.startsWith('/') ? '' : '/'}${img.image_url}`;
        return `      <g:additional_image_link>${escapeXml(fullUrl)}</g:additional_image_link>`;
      })
      .join('\n');

    const rawCategory = product.category?.name || 'Apparel';
    const categoryBreadcrumb = `Apparel &amp; Accessories &gt; Clothing &gt; ${escapeXml(rawCategory)}`;

    // If product has distinct variants (size/color), render item variants for accurate Shopping feed indexing
    if (variants.length > 0) {
      for (const variant of variants) {
        const variantId = variant.sku || `${product.slug}-${variant.id}`;
        const variantPrice = (
          Number(product.base_price) + Number(variant.price_adjustment || 0)
        ).toFixed(2);
        const availability = (variant.stock || 0) > 0 ? 'in_stock' : 'out_of_stock';
        const color = variant.color || product.metadata?.color || 'Multicolor';
        const size = variant.size || 'Free Size';
        const link = `${siteUrl}/product/${product.slug}?variant=${variant.id}&amp;utm_source=google&amp;utm_medium=free_listings&amp;utm_campaign=shopping`;

        const title = escapeXml(
          `${product.name} - ${color} / ${size} | Root & Loom`
        );

        itemsXml.push(`
    <item>
      <g:id>${escapeXml(variantId)}</g:id>
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>
      <g:title>${title}</g:title>
      <g:description>${cleanDescription(product.description)}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${escapeXml(primaryImgUrl)}</g:image_link>
${additionalImagesXml ? `${additionalImagesXml}\n` : ''}      <g:availability>${availability}</g:availability>
      <g:price>${variantPrice} INR</g:price>
      <g:google_product_category>1604</g:google_product_category>
      <g:product_type>${categoryBreadcrumb}</g:product_type>
      <g:brand>Root &amp; Loom</g:brand>
      <g:condition>new</g:condition>
      <g:gender>${escapeXml(product.metadata?.gender || 'unisex')}</g:gender>
      <g:age_group>adult</g:age_group>
      <g:color>${escapeXml(color)}</g:color>
      <g:size>${escapeXml(size)}</g:size>
      <g:size_system>IN</g:size_system>
      <g:material>${escapeXml(product.metadata?.material || '100% Organic Cotton')}</g:material>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>IN</g:country>
        <g:service>Standard Express</g:service>
        <g:price>${Number(variantPrice) >= 999 ? '0.00' : '99.00'} INR</g:price>
      </g:shipping>
    </item>`);
      }
    } else {
      // Fallback for single-sku products
      const availability = 'in_stock';
      const link = `${siteUrl}/product/${product.slug}?utm_source=google&amp;utm_medium=free_listings&amp;utm_campaign=shopping`;

      itemsXml.push(`
    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.name)} | Root &amp; Loom</g:title>
      <g:description>${cleanDescription(product.description)}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${escapeXml(primaryImgUrl)}</g:image_link>
${additionalImagesXml ? `${additionalImagesXml}\n` : ''}      <g:availability>${availability}</g:availability>
      <g:price>${Number(product.base_price).toFixed(2)} INR</g:price>
      <g:google_product_category>1604</g:google_product_category>
      <g:product_type>${categoryBreadcrumb}</g:product_type>
      <g:brand>Root &amp; Loom</g:brand>
      <g:condition>new</g:condition>
      <g:gender>unisex</g:gender>
      <g:age_group>adult</g:age_group>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>IN</g:country>
        <g:service>Standard Express</g:service>
        <g:price>${Number(product.base_price) >= 999 ? '0.00' : '99.00'} INR</g:price>
      </g:shipping>
    </item>`);
    }
  }

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Root &amp; Loom Official Product Feed</title>
    <link>${siteUrl}</link>
    <description>Sustainable Streetwear and Ethical Luxury Fashion Feed</description>
${itemsXml.join('')}
  </channel>
</rss>`;

  return new NextResponse(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
