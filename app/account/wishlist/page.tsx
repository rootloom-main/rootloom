import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductCard } from '@/components/product/product-card';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function WishlistPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login?next=/account/wishlist');
    }

    const { data: wishlists, error } = await supabase
        .from('wishlists')
        .select(`
            id,
            product:products (
                id,
                name,
                slug,
                base_price,
                product_images (
                    image_url,
                    alt_text,
                    display_order
                )
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-2 mb-8">
                <Heart className="h-6 w-6 text-red-500 fill-current" />
                <h1 className="text-3xl font-bold">My Wishlist</h1>
            </div>

            {wishlists && wishlists.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {wishlists.map((item: any) => (
                        <div key={item.id} className="relative">
                            <ProductCard product={item.product} />
                            {/* <div className="absolute top-2 right-2">
                                <WishlistButton productId={item.product.id} isWishlisted={true} />
                            </div> */}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
                    <p className="text-gray-500 mb-6">Save items you love to find them easily later.</p>
                    <Link href="/shop">
                        <Button>Start Shopping</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
