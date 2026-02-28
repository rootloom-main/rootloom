'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils/format';
import { Star, Eye, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WishlistButton } from '@/components/product/wishlist-button';
import { QuickViewModal } from '@/components/ui/quick-view-modal';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    base_price: number;
    description?: string;
    product_images: Array<{ image_url: string; alt_text: string | null }>;
    product_variants?: Array<{
      id: string;
      size: string;
      color: string;
      stock: number;
      price_adjustment: number;
    }>;
  };
  highlight?: string;
}

export function ProductCard({ product, highlight }: ProductCardProps) {
  const [mounted, setMounted] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const imageUrl =
    product.product_images?.[0]?.image_url ||
    'https://images.unsplash.com/photo-1560769625-ed5974877ebc?w=500&h=500&fit=crop';

  // Mock rating for visual consistency
  const rating = 4.5;
  const reviewCount = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50 + 10;

  // Highlight matching text function
  const highlightMatch = (text: string, term?: string) => {
    if (!term?.trim()) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="text-deep-forest font-extrabold bg-yellow-100 rounded-sm px-0.5">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <div className="group relative bg-white border border-stone-200 rounded-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden">
        <Link href={`/product/${product.slug}`} className="block relative aspect-[4/5] overflow-hidden bg-stone-100">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.base_price > 2000 && (
              <Badge className="bg-[#cc0c39] hover:bg-[#cc0c39] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                Best Seller
              </Badge>
            )}
          </div>

          {/* Wishlist Button */}
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-sm hover:bg-white transition-colors">
              <WishlistButton productId={product.id} />
            </div>
          </div>

          {/* Quick Actions overlay on desktop */}
          {mounted && (
            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-white/95 backdrop-blur-sm hidden md:flex flex-col gap-2 border-t border-stone-100">
              <Button size="sm" className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white rounded-sm text-xs font-semibold h-9 shadow-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsQuickViewOpen(true); }}>
                <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Add to Cart
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-stone-200 hover:bg-stone-50 text-stone-700 rounded-sm text-xs font-medium h-9"
                onClick={handleQuickView}
              >
                <Eye className="w-3.5 h-3.5 mr-2" /> Quick View
              </Button>
            </div>
          )}
        </Link>

        <div className="p-4 flex flex-col flex-1 gap-1.5">
          {/* Title */}
          <Link href={`/product/${product.slug}`} className="group-hover:text-deep-forest transition-colors">
            <h3 className="font-medium text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.5em]" title={product.name}>
              {highlightMatch(product.name, highlight)}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-1">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("w-3 h-3", i < Math.floor(rating) ? "fill-current" : "text-stone-200")} />
              ))}
            </div>
            <span className="text-xs text-slate-500 font-medium">({reviewCount})</span>
          </div>

          {/* Price */}
          <div className="mt-auto flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-slate-900">{formatPrice(product.base_price)}</span>
            {product.base_price > 1000 && (
              <>
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.base_price * 1.2)}
                </span>
                <span className="text-xs text-green-600 font-bold">20% off</span>
              </>
            )}
          </div>

          {/* Mobile Add to Cart (visible only on mobile) */}
          {mounted && (
            <div className="md:hidden mt-3 gap-2 flex">
              <Button variant="outline" size="sm" className="w-10 px-0 flex-shrink-0 border-stone-200 text-stone-600 hover:bg-stone-50 h-9 font-medium" onClick={handleQuickView}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="w-full border-stone-200 text-deep-forest hover:bg-stone-50 h-9 font-medium" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsQuickViewOpen(true); }}>
                Add to Cart
              </Button>
            </div>
          )}
        </div>
      </div>

      <QuickViewModal
        product={product}
        open={isQuickViewOpen}
        onOpenChange={setIsQuickViewOpen}
      />
    </>
  );
}
