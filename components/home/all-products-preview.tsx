import { createClient } from '@/lib/supabase/server';
import { ProductShowcase } from './product-showcase';

export async function AllProductsPreview({ limit = 12 }: { limit?: number }) {
    const supabase = await createClient();

    const { data: products } = await supabase
        .from('products')
        .select('id, name, slug, base_price, product_images(image_url, alt_text), product_variants(id, size, color, stock, price_adjustment)')
        .order('created_at', { ascending: false })
        .limit(limit);

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
