import { ProductService } from '@/lib/services/productService';
import { ProductShowcase } from './product-showcase';

export default async function BestSellers({ limit = 8 }: { limit?: number }) {
    // Fetch products using cached service
    const products = await ProductService.getBestSellers(limit);

    if (!products || products.length === 0) return null;

    return (
        <ProductShowcase
            title="Best Sellers"
            subtitle="Hype List"
            products={products}
            viewAllLink="/shop?sort=popularity"
            className="bg-[#f9f8f6]"
        />
    );
}
