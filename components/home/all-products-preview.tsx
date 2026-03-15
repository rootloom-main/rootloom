import { ProductService } from '@/lib/services/productService';
import { ProductShowcase } from './product-showcase';

export async function AllProductsPreview({ limit = 12 }: { limit?: number }) {
    const products = await ProductService.getNewArrivals(limit);

    if (!products || products.length === 0) return null;

    return (
        <ProductShowcase
            title="Explore Collection"
            subtitle="The Full Collection"
            products={products}
            viewAllLink="/shop"
            viewAllText="Browse Full Catalog"
            className="bg-white"
        />
    );
}
