import { createClient } from '@/lib/supabase/server';
import { ProductShowcase } from './product-showcase';

export async function BestSellers({ limit = 8 }: { limit?: number }) {
    const supabase = await createClient();

    // Fetch products sorted by sales_count
    // If sales_count is 0 for all, it falls back to created_at or implicit order
    const { data: products } = await supabase
        .from('products')
        .select('id, name, slug, base_price, product_images(image_url, alt_text)')
        .order('sales_count', { ascending: false })
        .limit(limit);

    if (!products || products.length === 0) return null;

    return (
        <ProductShowcase
            title="Best Sellers"
            subtitle="Customer Favorites"
            products={products}
            viewAllLink="/shop?sort=popularity"
            className="bg-[#f9f8f6]"
        />
    );
}
