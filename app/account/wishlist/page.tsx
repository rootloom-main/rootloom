import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Heart, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WishlistItem } from '@/components/wishlist/wishlist-item';

export const dynamic = 'force-dynamic';

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
        <div className="container mx-auto px-4 py-8 md:py-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-12 border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-medium text-deep-forest mb-2">
                        My Wishlist
                    </h1>
                    <p className="text-slate-500">
                        {wishlists?.length || 0} items saved for later
                    </p>
                </div>

                {wishlists && wishlists.length > 0 && (
                    <Button variant="outline" className="gap-2 rounded-full border-stone-300 hover:bg-stone-50">
                        <Share2 size={16} />
                        Share Wishlist
                    </Button>
                )}
            </div>

            {/* List */}
            {wishlists && wishlists.length > 0 ? (
                <div className="space-y-4">
                    {wishlists.map((item: any) => (
                        <WishlistItem
                            key={item.id}
                            item={item}
                            onRemove={() => { }} // Component handles self-refresh
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                        <Heart className="h-8 w-8 text-stone-300" />
                    </div>
                    <h2 className="text-2xl font-serif font-medium text-deep-forest mb-2">
                        Your wishlist is currently empty
                    </h2>
                    <p className="text-slate-500 max-w-md mb-8">
                        Explore our curated collection and save your favorites here for later.
                    </p>
                    <Link href="/shop">
                        <Button size="lg" className="rounded-full px-8 bg-deep-forest hover:bg-deep-forest/90">
                            Start Shopping
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
