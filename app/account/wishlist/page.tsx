import { createSSRClient } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
import { Heart, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WishlistItem } from '@/components/wishlist/wishlist-item';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
    const supabase = await createSSRClient();
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
                ),
                product_variants (
                    id,
                    price_adjustment,
                    stock
                )
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Filter out items where the product might have been deleted
    const validWishlists = wishlists?.filter((item: any) => item.product !== null) || [];

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-12 border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-medium text-deep-forest mb-2">
                        My Wishlist
                    </h1>
                    <p className="text-slate-500">
                        {validWishlists.length} items saved for later
                    </p>
                </div>

                {validWishlists.length > 0 && (
                    <Button variant="outline" className="gap-2 rounded-full border-stone-300 hover:bg-stone-50">
                        <Share2 size={16} />
                        Share Wishlist
                    </Button>
                )}
            </div>

            {/* List */}
            {validWishlists.length > 0 ? (
                <div className="space-y-4">
                    {validWishlists.map((item: any) => (
                        <WishlistItem
                            key={item.id}
                            item={item}
                        />
                    ))}
                </div>
            ) : (
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-20">
                    <div className="w-20 h-20 bg-heirloom-white rounded-full flex items-center justify-center mb-6">
                        <Heart className="h-8 w-8 text-stone-400" />
                    </div>
                    <h2 className="text-2xl font-serif font-medium text-deep-forest mb-3">
                        Your wishlist is currently empty
                    </h2>
                    <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
                        Curate your personal collection. Save items you love and revisit them anytime.
                    </p>
                    <Link href="/shop">
                        <Button size="lg" className="rounded-full px-8 bg-deep-forest hover:bg-deep-forest/90">
                            Explore Collection
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
