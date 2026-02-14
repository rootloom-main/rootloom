import Head from 'next/head';
import Script from 'next/script';

interface ProductSchemaProps {
    product: {
        name: string;
        description: string | null;
        images: string[];
        sku?: string;
        brand?: string;
        offers: {
            price: number;
            priceCurrency: string;
            availability: 'https://schema.org/InStock' | 'https://schema.org/OutOfStock';
            url: string;
        };
        aggregateRating?: {
            ratingValue: number;
            reviewCount: number;
        };
        reviews?: Array<{
            author: string;
            datePublished: string;
            reviewBody: string;
            reviewRating: number;
        }>;
    };
}

export function ProductSchema({ product }: ProductSchemaProps) {
    const schema: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description || '',
        image: product.images,
        sku: product.sku,
        brand: {
            '@type': 'Brand',
            name: product.brand || 'Root & Loom',
        },
        offers: {
            '@type': 'Offer',
            price: product.offers.price,
            priceCurrency: product.offers.priceCurrency,
            availability: product.offers.availability,
            url: product.offers.url,
            itemCondition: 'https://schema.org/NewCondition',
        },
    };

    if (product.aggregateRating && product.aggregateRating.reviewCount > 0) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: product.aggregateRating.ratingValue,
            reviewCount: product.aggregateRating.reviewCount,
        };
    }

    if (product.reviews && product.reviews.length > 0) {
        schema.review = product.reviews.map((review) => ({
            '@type': 'Review',
            author: {
                '@type': 'Person',
                name: review.author
            },
            datePublished: review.datePublished,
            reviewBody: review.reviewBody,
            reviewRating: {
                '@type': 'Rating',
                ratingValue: review.reviewRating,
            },
        }));
    }

    return (
        <Script
            id="product-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}

interface BreadcrumbSchemaProps {
    items: Array<{
        name: string;
        item: string;
    }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.item,
        })),
    };

    return (
        <Script
            id="breadcrumb-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
