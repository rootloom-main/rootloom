import React from 'react';

export interface ProductSchemaProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    images: string[];
    brand?: string;
    basePrice: number;
    salePrice?: number | null;
    currency?: string;
    inStock: boolean;
    sku?: string;
    gtin?: string;
    mpn?: string;
    color?: string;
    size?: string;
    pattern?: string;
    material?: string;
    gender?: 'Men' | 'Women' | 'Unisex' | string;
    category?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  reviews?: Array<{
    id?: string;
    author: string;
    rating: number;
    comment: string;
    createdAt?: string;
    datePublished?: string;
    reviewBody?: string;
    reviewRating?: number;
  }>;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  siteUrl?: string;
}

export function ProductSchema({
  product,
  reviews = [],
  aggregateRating,
  siteUrl = 'https://rootloom.in',
}: ProductSchemaProps) {
  const canonicalUrl = `${siteUrl}/product/${product.slug}`;
  const price = product.salePrice ?? product.basePrice;
  const currency = product.currency || 'INR';

  // Format valid absolute high-res image URLs
  const imageUrls = product.images.map((img) =>
    img.startsWith('http') ? img : `${siteUrl}${img.startsWith('/') ? '' : '/'}${img}`
  );

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name: product.name,
    description:
      product.description?.replace(/<[^>]*>/g, '').trim() ||
      `Buy ${product.name} online at Root & Loom. Sustainable handcrafted streetwear.`,
    image: imageUrls.length > 0 ? imageUrls : [`${siteUrl}/og-image.jpg`],
    sku: product.sku || product.slug,
    mpn: product.mpn || product.sku || product.slug,
    ...(product.gtin && { gtin: product.gtin }),
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Root & Loom',
    },
    category: product.category || 'Apparel & Accessories > Clothing',
    ...(product.color && { color: product.color }),
    ...(product.size && { size: product.size }),
    ...(product.pattern && { pattern: product.pattern }),
    ...(product.material && { material: product.material }),
    ...(product.gender && {
      audience: {
        '@type': 'PeopleAudience',
        suggestedGender: product.gender,
      },
    }),
    offers: {
      '@type': 'Offer',
      '@id': `${canonicalUrl}#offer`,
      url: canonicalUrl,
      priceCurrency: currency,
      price: price.toFixed(2),
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      seller: {
        '@type': 'Organization',
        name: 'Root & Loom',
        url: siteUrl,
      },
      // Google Merchant Rich Badges (Shipping & Free Return)
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: price >= 999 ? '0.00' : '99.00',
          currency: 'INR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'IN',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'd',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'd',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'IN',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnPeriod',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
        customerRemorseReturnFees: 'https://schema.org/FreeReturn',
      },
    },
  };

  // Add Aggregate Rating if valid reviews exist
  if (aggregateRating && aggregateRating.reviewCount > 0 && aggregateRating.ratingValue > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue.toFixed(1),
      reviewCount: aggregateRating.reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Add Individual Reviews
  if (reviews.length > 0) {
    schema.review = reviews.slice(0, 10).map((rev) => {
      const dateStr = rev.createdAt || rev.datePublished || new Date().toISOString();
      return {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: rev.author || 'Verified Buyer',
        },
        datePublished: dateStr.split('T')[0],
        reviewBody: rev.comment || rev.reviewBody || '',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: rev.rating ?? rev.reviewRating ?? 5,
          bestRating: '5',
          worstRating: '1',
        },
      };
    });
  }

  return (
    <script
      id={`jsonld-product-${product.id}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export interface BreadcrumbSchemaProps {
  items: Array<{ name: string; item?: string; url?: string }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item || item.url,
    })),
  };

  return (
    <script
      id="jsonld-breadcrumb"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
