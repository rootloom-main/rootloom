'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';
import { Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WishlistButton } from '@/components/product/wishlist-button';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    product_images: Array<{ image_url: string; alt_text: string | null }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl =
    product.product_images?.[0]?.image_url ||
    'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=400';

  // Mock rating for visual consistency (replace with real data later)
  const rating = 4.5;
  // Use a deterministic value based on product ID to avoid hydration mismatch
  const reviewCount = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50 + 10;

  return (
    <div className="group relative bg-white border border-stone-200 rounded-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      <Link href={`/product/${product.slug}`} className="block relative aspect-[4/5] overflow-hidden bg-stone-100">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.base_price > 2000 && (
            <Badge className="bg-[#cc0c39] hover:bg-[#cc0c39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
              Best Seller
            </Badge>
          )}
        </div>

        {/* Quick Actions overlay on desktop */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-white/90 backdrop-blur-sm hidden md:flex gap-2">
          <Button size="sm" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-sm text-xs font-medium h-9 pointer-events-none">
            {/* Since the whole card is a link, this button essentially just looks good and communicates 'View' */}
            <Eye className="w-3.5 h-3.5 mr-2" /> View Details
          </Button>
          <div className="pointer-events-auto">
            {/* Wrap in div to isolate pointer events if needed, but WishlistButton handles stopPropagation */}
            <WishlistButton productId={product.id} />
          </div>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Title */}
        <Link href={`/product/${product.slug}`} className="hover:text-[#8c5a45] transition-colors">
          <h3 className="font-medium text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.5em]">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'fill-current' : 'text-stone-300'}`} />
            ))}
          </div>
          <span className="text-xs text-blue-600 font-medium hover:underline cursor-pointer">{reviewCount}</span>
        </div>

        {/* Price */}
        <div className="mt-auto pt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-900">{formatPrice(product.base_price)}</span>
          <span className="text-xs text-slate-500 line-through">
            {formatPrice(product.base_price * 1.2)}
          </span>
          <span className="text-xs text-green-600 font-medium">20% off</span>
        </div>

        <div className="text-[10px] text-slate-500 font-medium">
          Free Delivery by <span className="text-slate-900 font-bold">Root&Loom</span>
        </div>

        {/* Mobile Add to Cart (visible only on mobile) */}
        <Link href={`/product/${product.slug}`} className="w-full mt-3 md:hidden">
          <Button size="sm" className="w-full bg-deep-forest text-heirloom-white text-sm h-10 rounded-md shadow-sm">
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
