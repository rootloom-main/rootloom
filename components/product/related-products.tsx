import { ProductCard } from '@/components/product/product-card';

interface RelatedProductsProps {
    products: any[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
    if (!products || products.length === 0) return null;

    return (
        <div className="mt-16 border-t pt-12">
            <h2 className="text-2xl font-bold mb-8 text-deep-forest">You Might Also Like</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}
