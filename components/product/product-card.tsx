'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils/format';
import { getProductPrice, calculateMRP, calculateDiscountPercentage } from '@/lib/utils/pricing';
import { Star, Eye, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WishlistButton } from '@/components/product/wishlist-button';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const QuickViewModal = dynamic(() => import('@/components/ui/quick-view-modal').then(mod => mod.QuickViewModal), { ssr: false });

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
  priority?: boolean;
}

export function ProductCard({ product, highlight, priority }: ProductCardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  const [swipeAdded, setSwipeAdded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const imageUrl =
    product.product_images?.[0]?.image_url ||
    'https://images.unsplash.com/photo-1560769625-ed5974877ebc?w=500&h=500&fit=crop';

  // Mock rating for visual consistency
  const rating = 4.5;
  const reviewCount = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 50 + 10;

  const displayPrice = getProductPrice(product);
  const mrp = calculateMRP(displayPrice);
  const discount = calculateDiscountPercentage(displayPrice, mrp);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;

    // Swipe Right (negative distance means moved right)
    if (distance < -50) {
      // Trigger Quick View / Add
      setIsQuickViewOpen(true);
      setSwipeAdded(true);
      setTimeout(() => setSwipeAdded(false), 1500);
    }
    setTouchStart(null);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      e.preventDefault(); // Prevent second click
      const btn = document.getElementById(`wishlist-btn-${product.id}`);
      if (btn) btn.click();
    }
    setLastTap(now);
  };

  return (
    <>
      <div
        className="group relative bg-white border border-stone-200 rounded-xl hover:shadow-[0_0_30px_rgba(255,0,255,0.15)] hover:border-[#ff00ff]/30 transition-all duration-500 flex flex-col h-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
      >
        <div onClick={() => router.push(`/product/${product.slug}`)} className="cursor-pointer block relative aspect-[4/5] overflow-hidden bg-stone-100">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {product.base_price > 2000 && (
              <Badge className="bg-[#ff00ff] hover:bg-[#ff00ff] text-white text-[10px] font-black px-2 py-1 rounded-none uppercase tracking-widest shadow-[4px_4px_0px_#000]">
                Best Seller
              </Badge>
            )}
            {discount > 25 && (
              <Badge className="bg-[#00ffff] hover:bg-[#00ffff] text-black text-[10px] font-black px-2 py-1 rounded-none uppercase tracking-widest shadow-[4px_4px_0px_#000]">
                Hype Drop
              </Badge>
            )}
          </div>

          {/* Wishlist Button (Thumb-zone optimized) */}
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-white/90 backdrop-blur-md rounded-full p-2.5 shadow-sm hover:shadow-md hover:bg-white active:scale-90 transition-all cursor-pointer">
              <WishlistButton productId={product.id} />
            </div>
          </div>

          {/* Quick Actions overlay on desktop */}
          {mounted && (
            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-white/95 backdrop-blur-sm hidden md:flex flex-col gap-2 border-t border-stone-100">
              <Button size="sm" className="w-full bg-black hover:bg-black text-white rounded-none text-xs font-black uppercase tracking-widest h-10 shadow-[4px_4px_0px_#ff00ff] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsQuickViewOpen(true); }}>
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
        </div>

        <div className="p-4 flex flex-col flex-1 gap-1.5">
          {/* Title */}
          <Link href={`/product/${product.slug}`} className="group-hover:text-[#ff00ff] transition-colors">
            <h3 className="font-black text-slate-900 text-sm md:text-base leading-tight line-clamp-2 min-h-[2.5em] uppercase tracking-tight italic" title={product.name}>
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
            <span className="text-xl font-black text-slate-900 tracking-tighter">{formatPrice(displayPrice)}</span>
            {discount > 0 && (
              <>
                <span className="text-sm text-stone-400 line-through">
                  {formatPrice(mrp)}
                </span>
                <span className="text-[11px] font-bold text-deep-forest bg-deep-forest/5 px-1.5 py-0.5 rounded-sm tracking-wide uppercase">
                  ({discount}% OFF)
                </span>
              </>
            )}
          </div>

          {/* Mobile Add to Cart (visible only on mobile) */}
          {mounted && (
            <div className="md:hidden mt-3 gap-2 flex">
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
