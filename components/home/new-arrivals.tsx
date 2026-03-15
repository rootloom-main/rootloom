import { ProductService } from '@/lib/services/productService';
import { ProductShowcase } from './product-showcase';

export async function NewArrivals({ 
    limit = 8, 
    category,
    title = "Fresh Drops",
    subtitle = "New Arrivals"
}: { 
    limit?: number;
    category?: string;
    title?: string;
    subtitle?: string;
}) {
    const products = await ProductService.getNewArrivals(limit, category);

    if (!products || products.length === 0) return null;

    return (
        <ProductShowcase
            title={title}
            subtitle={subtitle}
            products={products}
            viewAllLink={category ? `/shop?category=${category}` : "/shop?sort=newest"}
            className="bg-stone-50"
        />
    );
}
