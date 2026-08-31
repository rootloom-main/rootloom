import { Metadata } from 'next';

export interface ProductMetadataInput {
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  salePrice?: number | null;
  categoryName?: string;
  gender?: string;
  material?: string;
  color?: string;
  images: string[];
}

/**
 * Generates SEO & Rich Social Metadata for apparel PDPs compliant with
 * Google SERP limits, Perplexity/AI Search citation formats, and OpenGraph/Twitter standards.
 */
export function generateProductMetadata(product: ProductMetadataInput): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.in';
  const canonicalUrl = `${siteUrl}/product/${product.slug}`;

  // Title Formula: [Product Name] - [Category] [Gender] | Root & Loom
  const categoryStr = product.categoryName || 'Streetwear';
  const genderStr = product.gender ? ` for ${product.gender}` : '';
  const title = `${product.name} - ${categoryStr}${genderStr} | Root & Loom`;

  // Meta Description (140-155 chars):
  // Action verb + USP + Fabric + Price + Free shipping CTA
  const price = product.salePrice ?? product.basePrice;
  const fabricStr = product.material ? ` Crafted in ${product.material}.` : '';
  const rawDesc = product.description
    ? product.description.replace(/<[^>]*>/g, '').trim().slice(0, 90)
    : `Shop the ${product.name} at Root & Loom.`;

  const description = `${rawDesc}${fabricStr} Buy online for ₹${price}. Free Delivery over ₹999.`;

  // Primary image
  const primaryImage = product.images[0]
    ? product.images[0].startsWith('http')
      ? product.images[0]
      : `${siteUrl}${product.images[0].startsWith('/') ? '' : '/'}${product.images[0]}`
    : `${siteUrl}/og-image.jpg`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: description.slice(0, 160),
      url: canonicalUrl,
      siteName: 'Root & Loom',
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: primaryImage,
          width: 1200,
          height: 630,
          alt: `${product.name} - Root & Loom Sustainable Fashion`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 160),
      images: [primaryImage],
      creator: '@rootloom.in',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'product:price:amount': `${price}`,
      'product:price:currency': 'INR',
      'product:availability': 'in stock',
      'product:brand': 'Root & Loom',
      'product:condition': 'new',
    },
  };
}
