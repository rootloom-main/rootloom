'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/components/providers/cart-provider';
import { captureEvent } from '@/lib/analytics/capture';
import { formatPrice } from '@/lib/utils/format';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { getProductPrice, calculateMRP, calculateDiscountPercentage } from '@/lib/utils/pricing';
import {
  Minus, Plus, ShoppingCart, ChevronLeft, Truck, ShieldCheck,
  RotateCcw, Banknote, BadgeCheck, Award, Globe, Star, Flame,
  Package, Tag, Ruler, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { SizeGuide } from '@/components/product/size-guide';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ImageGallery } from '@/components/product/image-gallery';
import { DeliveryChecker } from '@/components/product/delivery-checker';
import { StickyAddToCart } from '@/components/product/sticky-add-to-cart';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  price_adjustment: number;
  sku: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  category: {
    name: string;
    slug: string;
  } | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  metadata?: {
    fabric?: string;
    material?: string;
    genz_tagline?: string;
    shipping_info?: string;
    size_guide_html?: string;
    perks?: { label: string; desc: string }[];
  };
}

const COLOR_MAP: Record<string, string> = {
  black: '#1A1A1A', white: '#FFFFFF', red: '#D32F2F', navy: '#1A237E',
  blue: '#1976D2', green: '#388E3C', olive: '#5E6B5B', khaki: '#BDB76B',
  beige: '#F5F5DC', ivory: '#FFFFF0', grey: '#9E9E9E', gray: '#9E9E9E',
  brown: '#795548', cream: '#FFFDD0', mustard: '#FFDB58', teal: '#009688',
  maroon: '#800000', peach: '#FFDAB9', pink: '#F48FB1', yellow: '#FDD835',
  orange: '#FB8C00', purple: '#7B1FA2', charcoal: '#36454F', sand: '#D2B48C',
  rust: '#B7410E', terracotta: '#C07050',
};

function getColorDot(colorName: string) {
  const lc = colorName.toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lc.includes(key)) return hex;
  }
  return null;
}

const TABS = ['Description', 'Fabric & Material', 'Size Guide', 'Shipping & Returns'] as const;
type Tab = typeof TABS[number];

export function ProductDetails({
  product,
  isWishlisted = false,
  averageRating,
  totalReviews
}: {
  product: Product;
  isWishlisted?: boolean;
  averageRating?: number;
  totalReviews?: number;
}) {
  const { user, openLoginModal } = useAuth();
  const router = useRouter();
  const { addToCart } = useCart();
  const supabase = createClient();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Description');
  const [isBuying, setIsBuying] = useState(false);

  const sizeContainerRef = useRef<HTMLDivElement>(null);
  const [highlightSize, setHighlightSize] = useState(false);
  const [pendingAction, setPendingAction] = useState<'BUY_NOW' | 'ADD_TO_CART' | null>(null);

  // Pre-select first available in-stock variant color on load, keeping size unselected
  useEffect(() => {
    if (product.product_variants.length > 0) {
      const firstInStock = product.product_variants.find(v => v.stock > 0);
      if (firstInStock) {
        setSelectedSize('');
        setSelectedColor(firstInStock.color);
      } else {
        setSelectedSize('');
        setSelectedColor(product.product_variants[0].color);
      }
    }
  }, [product]);

  // Helper to trigger pending cart/buy action when size is selected
  const triggerPendingAction = (size: string, color: string) => {
    if (!pendingAction) return;

    const variant = product.product_variants.find(
      (v) => v.size.toLowerCase() === size.toLowerCase() && 
             v.color.toLowerCase() === color.toLowerCase()
    );

    if (!variant) {
      toast.error('Selected variant not available');
      setPendingAction(null);
      return;
    }

    if (variant.stock < quantity) {
      toast.error('Not enough stock available');
      setPendingAction(null);
      return;
    }

    const action = pendingAction;
    setPendingAction(null); // Clear it first

    if (action === 'ADD_TO_CART') {
      executeAddToCart(variant, size, color);
    } else if (action === 'BUY_NOW') {
      executeBuyNow(variant, size, color);
    }
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    
    // Check if the current selectedSize is available and in stock for the new color
    const lowerColor = color.toLowerCase();
    const colorVariants = product.product_variants.filter(
      v => v.color.toLowerCase() === lowerColor
    );
    
    const currentSizeAvailable = colorVariants.find(
      v => v.size.toLowerCase() === selectedSize.toLowerCase() && v.stock > 0
    );
    
    // If not available in the new color, reset size to unselected
    if (!currentSizeAvailable) {
      setSelectedSize('');
    }
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    
    // Check if selectedColor is available for this new size
    const lowerSize = size.toLowerCase();
    const sizeVariants = product.product_variants.filter(
      v => v.size.toLowerCase() === lowerSize
    );
    
    const currentColorAvailable = sizeVariants.find(
      v => v.color.toLowerCase() === selectedColor.toLowerCase() && v.stock > 0
    );
    
    let targetColor = selectedColor;
    if (!currentColorAvailable && sizeVariants.length > 0) {
      // Find first in-stock color for this size
      const firstInStockColor = sizeVariants.find(v => v.stock > 0);
      if (firstInStockColor) {
        setSelectedColor(firstInStockColor.color);
        targetColor = firstInStockColor.color;
      } else {
        setSelectedColor(sizeVariants[0].color);
        targetColor = sizeVariants[0].color;
      }
    }
    
    triggerPendingAction(size, targetColor);
  };

  useEffect(() => {
    captureEvent('product_viewed', {
      product_id: product.id,
      product_name: product.name,
      price: product.base_price,
      category: product.category?.name
    });
    try {
      const stored = localStorage.getItem('recentlyViewed');
      let viewedProducts = stored ? JSON.parse(stored) : [];
      const newProduct = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        base_price: product.base_price,
        image_url: product.product_images?.[0]?.image_url || '/placeholder.png'
      };
      viewedProducts = viewedProducts.filter((p: any) => p.id !== product.id);
      viewedProducts.unshift(newProduct);
      viewedProducts = viewedProducts.slice(0, 10);
      localStorage.setItem('recentlyViewed', JSON.stringify(viewedProducts));
    } catch (e) {
      console.error('Failed to save recently viewed', e);
    }
  }, [product]);

  // Exit-Intent Micro Trigger
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let hasTriggeredExitIntent = false;

    const handleScroll = () => {
      if (hasTriggeredExitIntent) return;
      const currentScrollY = window.scrollY;
      const scrollVelocity = currentScrollY - lastScrollY;

      // Scroll up rapidly
      if (scrollVelocity < -50 && currentScrollY > 300) {
        toast('⏱️ Still thinking? Free delivery ends today.', {
          position: 'bottom-center',
          className: 'bg-deep-forest text-white border-none font-semibold text-sm',
          duration: 5000,
        });
        hasTriggeredExitIntent = true;
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // De-duplicate colors and sizes case-insensitively while preserving original casing
  const uniqueColors = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of product.product_variants) {
      const lower = v.color.trim().toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(v.color.trim());
      }
    }
    return result;
  }, [product.product_variants]);

  const uniqueSizes = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const v of product.product_variants) {
      const lower = v.size.trim().toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(v.size.trim());
      }
    }
    
    return result.sort((a, b) => {
      const sizeOrder: Record<string, number> = {
        'xxs': 1, 'xs': 2, 's': 3, 'm': 4, 'l': 5, 'xl': 6,
        'xxl': 7, '2xl': 7, 'xxxl': 8, '3xl': 8, '4xl': 9, '5xl': 10
      };

      const aClean = a.trim().toLowerCase();
      const bClean = b.trim().toLowerCase();

      const aNum = Number(aClean);
      const bNum = Number(bClean);

      const isANum = !isNaN(aNum) && aClean !== '';
      const isBNum = !isNaN(bNum) && bClean !== '';

      if (isANum && isBNum) {
        return aNum - bNum;
      }

      if (isANum) return -1;
      if (isBNum) return 1;

      const aWeight = sizeOrder[aClean];
      const bWeight = sizeOrder[bClean];

      if (aWeight !== undefined && bWeight !== undefined) {
        return aWeight - bWeight;
      }

      return aClean.localeCompare(bClean);
    });
  }, [product.product_variants]);

  const availableColors = useMemo(() => {
    if (!selectedSize) return uniqueColors;
    const lowerSize = selectedSize.toLowerCase();
    const matches = product.product_variants
      .filter((v) => v.size.toLowerCase() === lowerSize && v.stock > 0)
      .map((v) => v.color.toLowerCase());
    return uniqueColors.filter(c => matches.includes(c.toLowerCase()));
  }, [selectedSize, uniqueColors, product.product_variants]);

  const availableSizes = useMemo(() => {
    if (!selectedColor) return uniqueSizes;
    const lowerColor = selectedColor.toLowerCase();
    const matches = product.product_variants
      .filter((v) => v.color.toLowerCase() === lowerColor && v.stock > 0)
      .map((v) => v.size.toLowerCase());
    return uniqueSizes.filter(s => matches.includes(s.toLowerCase()));
  }, [selectedColor, uniqueSizes, product.product_variants]);

  const selectedVariant = useMemo(() => {
    return product.product_variants.find(
      (v) => v.size.toLowerCase() === selectedSize.toLowerCase() && 
             v.color.toLowerCase() === selectedColor.toLowerCase()
    );
  }, [selectedSize, selectedColor, product.product_variants]);

  const finalPrice = getProductPrice(product, selectedVariant);
  const mrp = calculateMRP(finalPrice);
  const discount = calculateDiscountPercentage(finalPrice, mrp);

  // Filter images based on selected color matching alt text
  const filteredImages = useMemo(() => {
    if (!selectedColor) return product.product_images;
    const lowerColor = selectedColor.trim().toLowerCase();
    const matches = product.product_images.filter((img) => {
      const alt = (img.alt_text || '').toLowerCase();
      return alt.includes(lowerColor);
    });
    return matches.length > 0 ? matches : product.product_images;
  }, [product.product_images, selectedColor]);

  const isOutOfStockGlobally = useMemo(() => {
    return product.product_variants.every((v) => v.stock === 0);
  }, [product.product_variants]);

  const isButtonDisabled = isBuying || isAdding || isOutOfStockGlobally || (
    !!selectedSize && !!selectedColor && !!selectedVariant && selectedVariant.stock === 0
  );

  const buyNowText = isBuying
    ? 'Processing...'
    : (isOutOfStockGlobally || (!!selectedSize && selectedVariant?.stock === 0))
      ? 'OUT OF STOCK'
      : '⚡ BUY NOW';

  const addToCartText = isAdding
    ? 'Adding...'
    : (isOutOfStockGlobally || (!!selectedSize && selectedVariant?.stock === 0))
      ? 'OUT OF STOCK'
      : 'ADD TO CART';

  const executeAddToCart = async (variant: any, size: string, color: string) => {
    setIsAdding(true);
    try {
      captureEvent('added_to_cart', { product_id: product.id, product_name: product.name, variant_id: variant.id, size: size, color: color, price: finalPrice, quantity });

      await addToCart({
        productId: product.id,
        variantId: variant.id,
        quantity,
        productData: {
          name: product.name,
          slug: product.slug,
          base_price: product.base_price,
          product_images: product.product_images
        },
        variantData: {
          size: size,
          color: color,
          price_adjustment: variant.price_adjustment,
          stock: variant.stock
        }
      });
    } finally {
      setIsAdding(false);
    }
  };

  const executeBuyNow = async (variant: any, size: string, color: string) => {
    setIsBuying(true);
    try {
      const price = product.base_price + (variant.price_adjustment || 0);
      const buyNowItem = {
        productId: product.id,
        variantId: variant.id,
        quantity,
        price,
        name: product.name,
        image: product.product_images?.[0]?.image_url || '',
        size,
        color,
      };
      sessionStorage.setItem('rootloom_buy_now_item', JSON.stringify(buyNowItem));
      router.push('/checkout?source=BUY_NOW');
    } finally {
      setIsBuying(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedColor) {
      toast.error('Please select a color.');
      return;
    }

    if (!selectedSize) {
      toast.error('Please select your size.');
      setPendingAction('ADD_TO_CART');
      setHighlightSize(true);
      setTimeout(() => setHighlightSize(false), 1200);
      sizeContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!selectedVariant) {
      toast.error('Selected variant not available');
      return;
    }

    if (selectedVariant.stock < quantity) {
      toast.error('Not enough stock available');
      return;
    }

    await executeAddToCart(selectedVariant, selectedSize, selectedColor);
  };

  const handleBuyNow = async () => {
    if (!selectedColor) {
      toast.error('Please select a color.');
      return;
    }

    if (!selectedSize) {
      toast.error('Please select your size to continue.');
      setPendingAction('BUY_NOW');
      setHighlightSize(true);
      setTimeout(() => setHighlightSize(false), 1200);
      sizeContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!selectedVariant) {
      toast.error('Selected variant not available');
      return;
    }

    if (selectedVariant.stock < quantity) {
      toast.error('Not enough stock available');
      return;
    }

    if (!user) {
      const price = product.base_price + (selectedVariant.price_adjustment || 0);
      const buyNowItem = {
        productId: product.id,
        variantId: selectedVariant.id,
        quantity,
        price,
        name: product.name,
        image: product.product_images?.[0]?.image_url || '',
        size: selectedSize,
        color: selectedColor,
      };
      sessionStorage.setItem('rootloom_buy_now_item', JSON.stringify(buyNowItem));
      openLoginModal(`/checkout?source=BUY_NOW`, undefined, 'product');
      return;
    }

    await executeBuyNow(selectedVariant, selectedSize, selectedColor);
  };

  return (
    <div className="bg-stone-50/50 min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-screen-xl">
        {/* Back link */}
        <Link href="/shop" className="inline-flex items-center text-sm text-stone-500 hover:text-deep-forest mb-6 transition-colors group">
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
          Back to Shop
        </Link>

        {/* Hero: Gallery + Info */}
        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16">
          {/* Left: Image Gallery */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ImageGallery
              images={filteredImages}
              productName={product.name}
              productId={product.id}
              isWishlisted={isWishlisted}
            />
          </div>

          {/* Right: Product Info */}
          <div className="space-y-6">
            {/* Category + Name + Rating */}
            <div className="space-y-3">
              {product.category && (
                <Link href={`/shop?category=${product.category.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-moss-olive hover:text-deep-forest tracking-widest uppercase transition-colors bg-moss-olive/10 px-3 py-1.5 rounded-full">
                  {product.category.name}
                </Link>
              )}

              <h1 className="text-3xl lg:text-4xl font-bold text-deep-forest font-serif leading-tight tracking-tight">
                {product.name}
              </h1>

              {/* Gen-Z Dynamic Tagline */}
              {product.metadata?.genz_tagline && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 bg-fuchsia-600 text-white rounded-sm shadow-[3px_3px_0px_#000] rotate-[-1deg]">
                    {product.metadata.genz_tagline}
                  </span>
                </div>
              )}

              {/* Rating row */}
              <div className="flex items-center gap-3">
                {totalReviews && totalReviews > 0 ? (
                  <>
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                      <div className="flex text-amber-500">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={cn('w-3.5 h-3.5', i <= Math.round(averageRating || 0) ? 'fill-current' : 'text-amber-200 fill-current')} />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-700">{(averageRating || 0).toFixed(1)}</span>
                    </div>
                    <a href="#reviews" className="text-sm text-stone-500 hover:text-deep-forest underline-offset-2 hover:underline transition-colors">
                      {totalReviews} Ratings
                    </a>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full px-3 py-1 text-xs font-medium text-stone-500">
                    No ratings yet
                  </div>
                )}
                <span className="text-stone-300">|</span>
                <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified Brand
                </span>
              </div>
            </div>

            {/* Price Block */}
            <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-extrabold text-deep-forest">{formatPrice(finalPrice)}</span>
                <span className="text-lg text-stone-400 line-through font-medium">{formatPrice(mrp)}</span>
                <span className="text-[13px] font-bold text-deep-forest bg-deep-forest/5 border border-deep-forest/10 px-2.5 py-1 rounded-md tracking-wide uppercase">
                  ({discount}% OFF)
                </span>
              </div>
              <p className="text-xs text-stone-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Inclusive of all taxes. Free delivery on orders above ₹999.
              </p>

              {/* Offers */}
              <div className="mt-3 pt-3 border-t border-stone-100">
                <p className="text-xs font-bold text-deep-forest mb-2 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-green-600" /> Available Offers
                </p>
                <ul className="space-y-1.5">
                  <li className="text-xs text-stone-600 flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">›</span>
                    10% instant discount on HDFC Bank Credit Cards. T&C apply.
                  </li>
                  <li className="text-xs text-stone-600 flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">›</span>
                    Get ₹150 cashback using RuPay Credit Card. Min order ₹1500.
                  </li>
                </ul>
              </div>
            </div>

            {/* Color & Size Selectors */}
            <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-5">
              {/* Color */}
              {uniqueColors.length > 1 ? (
                <div>
                  <Label className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-700">
                    Color:
                    {selectedColor && (
                      <span className="font-semibold text-deep-forest bg-stone-100 px-2.5 py-0.5 rounded-full text-xs">
                        {selectedColor}
                      </span>
                    )}
                  </Label>
                  <RadioGroup value={selectedColor} onValueChange={handleColorChange}>
                    <div className="flex gap-2.5 flex-wrap">
                      {uniqueColors.map((color) => {
                        const isAvailable = availableColors.includes(color);
                        const colorHex = getColorDot(color);
                        return (
                          <div key={color}>
                            <RadioGroupItem value={color} id={`color-${color}`} className="peer sr-only" disabled={!isAvailable} />
                            <Label
                              htmlFor={`color-${color}`}
                              className={cn(
                                'flex items-center gap-2 px-3.5 py-2 border-2 rounded-xl cursor-pointer text-xs font-semibold transition-all duration-200',
                                selectedColor === color
                                  ? 'border-deep-forest bg-deep-forest/5 text-deep-forest shadow-sm'
                                  : isAvailable
                                    ? 'border-stone-200 hover:border-stone-400 text-stone-600 hover:bg-stone-50'
                                    : 'opacity-40 cursor-not-allowed border-stone-100 text-stone-300 line-through'
                              )}
                            >
                              {colorHex && (
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-stone-300 inline-block flex-shrink-0"
                                  style={{ backgroundColor: colorHex }}
                                />
                              )}
                              {color}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </div>
              ) : uniqueColors.length === 1 ? (
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-700">
                    Color:
                  </Label>
                  <div className="flex">
                    <span className="inline-flex items-center gap-2 px-4 py-2 border border-stone-200 bg-stone-50/70 text-stone-700 rounded-xl text-xs font-bold uppercase tracking-wider select-none">
                      {getColorDot(uniqueColors[0]) && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-stone-300 inline-block flex-shrink-0"
                          style={{ backgroundColor: getColorDot(uniqueColors[0]) || undefined }}
                        />
                      )}
                      {uniqueColors[0]}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Size */}
              <div 
                id="size-selector"
                ref={sizeContainerRef}
                className={cn(
                  "transition-all duration-300 p-3 rounded-2xl border-2",
                  highlightSize 
                    ? "border-red-500 bg-red-50/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse scale-102"
                    : "border-transparent"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-bold text-stone-700 flex items-center gap-2">
                    Size:
                    {selectedSize && (
                      <span className="font-semibold text-deep-forest bg-stone-100 px-2.5 py-0.5 rounded-full text-xs">{selectedSize}</span>
                    )}
                  </Label>
                  <SizeGuide />
                </div>
                <RadioGroup value={selectedSize} onValueChange={handleSizeChange}>
                  <div className="flex gap-2.5 flex-wrap">
                    {uniqueSizes.map((size) => {
                      const isAvailable = availableSizes.includes(size);
                      return (
                        <div key={size}>
                          <RadioGroupItem value={size} id={`size-${size}`} className="peer sr-only" disabled={!isAvailable} />
                          <Label
                            htmlFor={`size-${size}`}
                            className={cn(
                              'flex items-center justify-center min-w-12 h-12 px-3 border-2 rounded-xl cursor-pointer text-sm font-bold transition-all duration-200 select-none relative group active:scale-95 peer-focus-visible:ring-2 peer-focus-visible:ring-deep-forest peer-focus-visible:ring-offset-2',
                              selectedSize === size
                                ? 'border-deep-forest bg-deep-forest text-white shadow-md scale-105'
                                : isAvailable
                                  ? 'border-stone-200 hover:border-deep-forest text-stone-700 hover:bg-stone-50 hover:scale-102'
                                  : 'opacity-35 cursor-not-allowed border-stone-100 bg-stone-50/50 text-stone-300'
                            )}
                          >
                            <span>{size}</span>
                            {selectedSize === size && (
                              <span className="ml-1 text-xs font-black text-white bg-white/20 rounded-full px-1.5 py-0.5">✓</span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              {/* Stock warning */}
              {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <Flame className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600 font-semibold">Only {selectedVariant.stock} left! Order now.</p>
                </div>
              )}
              {selectedVariant && selectedVariant.stock === 0 && (
                <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5">
                  <p className="text-sm text-stone-500 font-medium">Currently out of stock for this combination.</p>
                </div>
              )}
            </div>

            {/* Quantity + Actions */}
            <div id="primary-add-to-cart" className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <Label className="text-sm font-bold text-stone-700">Qty:</Label>
                <div className="flex items-center border-2 border-stone-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3.5 py-2.5 hover:bg-stone-50 text-stone-600 disabled:opacity-40 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-5 py-2 font-bold text-stone-800 min-w-[3rem] text-center text-sm border-x-2 border-stone-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(selectedVariant?.stock || 10, quantity + 1))}
                    disabled={!!selectedVariant && quantity >= selectedVariant.stock}
                    className="px-3.5 py-2.5 hover:bg-stone-50 text-stone-600 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {selectedVariant && selectedVariant.stock > 5 && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> In Stock
                  </span>
                )}
              </div>

              {/* Trust Signal Strip */}
              <div className="flex items-center gap-4 px-2 py-1 mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                  Secure Payment
                </div>
                <div className="h-3 w-px bg-stone-200" />
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
                  Easy Returns
                </div>
                <div className="h-3 w-px bg-stone-200" />
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                  Free Shipping
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1 bg-deep-forest hover:bg-slate-900 text-white font-black rounded-xl shadow-lg shadow-deep-forest/20 hover:shadow-deep-forest/30 transition-all duration-300 text-xl h-16 uppercase tracking-widest border-2 border-transparent"
                  onClick={handleBuyNow}
                  disabled={isButtonDisabled}
                >
                  {buyNowText}
                </Button>
                <Button
                  size="lg"
                  className="flex-1 bg-raw-clay hover:bg-[#7a4e3c] text-white font-black rounded-xl shadow-lg shadow-raw-clay/20 hover:shadow-raw-clay/30 transition-all duration-300 text-xl h-16 uppercase tracking-widest"
                  onClick={handleAddToCart}
                  disabled={isButtonDisabled}
                >
                  <ShoppingCart className="h-5 w-5 mr-2 flex-shrink-0" />
                  {addToCartText}
                </Button>
              </div>

              {/* Secure badge */}
              <div className="flex items-center justify-center gap-2 text-xs text-stone-400 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                <span>100% Secure & Encrypted Payment</span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Truck, title: 'Free Delivery', sub: 'On orders ₹999+', color: 'text-blue-500' },
                { icon: RotateCcw, title: '7-Day Returns', sub: 'Easy & hassle-free', color: 'text-purple-500' },
                { icon: ShieldCheck, title: '100% Secure', sub: 'Payments protected', color: 'text-green-500' },
                { icon: Banknote, title: 'Cash on Delivery', sub: 'Available nationwide', color: 'text-orange-500' },
              ].map(({ icon: Icon, title, sub, color }) => (
                <div key={title} className="bg-white rounded-xl p-3.5 border border-stone-100 text-center flex flex-col items-center gap-1.5 shadow-sm hover:shadow-md transition-shadow">
                  <Icon className={cn('h-5 w-5', color)} />
                  <p className="text-xs font-bold text-stone-700 leading-tight">{title}</p>
                  <p className="text-[10px] text-stone-400 leading-tight">{sub}</p>
                </div>
              ))}
            </div>

            {/* Delivery Checker */}
            <DeliveryChecker />

            {/* Brand authenticity strip */}
            <div className="flex flex-wrap items-center gap-y-4 gap-x-8 py-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-stone-500 uppercase tracking-widest">
                <Award className="h-4 w-4 text-moss-olive flex-shrink-0" />
                Authentic Quality
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-stone-500 uppercase tracking-widest">
                <Globe className="h-4 w-4 text-moss-olive flex-shrink-0" />
                Ethically Sourced
              </div>
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                Ships from <span className="text-stone-600">Root & Loom</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Tabbed Product Details */}
        <div className="mt-14">
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-stone-100">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-6 py-4 text-sm font-bold whitespace-nowrap transition-all duration-200 border-b-2 -mb-px tracking-wide',
                    activeTab === tab
                      ? 'border-deep-forest text-deep-forest'
                      : 'border-transparent text-stone-400 hover:text-stone-600'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6 lg:p-8">
              {activeTab === 'Description' && (
                <div className="max-w-3xl space-y-4">
                  <h3 className="font-serif font-bold text-xl text-deep-forest">About This Product</h3>
                  <p className="text-stone-600 leading-relaxed">
                    {product.description || 'A beautifully crafted piece from Root & Loom\'s collection, designed with the finest natural materials and careful attention to detail. Each item reflects our commitment to sustainable fashion and timeless style.'}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 mt-6">
                    {(product.metadata?.perks || [
                      { label: 'Premium Packaging', desc: 'Arrives in eco-friendly packaging' },
                      { label: 'Quality Assured', desc: 'Every piece hand-inspected' },
                      { label: 'Sustainable', desc: 'Eco-conscious production' },
                      { icon: BadgeCheck, label: 'Verified Brand', desc: 'Authentic Root & Loom product' },
                    ]).map((perk, i) => {
                      const icons = [Package, Award, Globe, BadgeCheck];
                      const Icon = icons[i % icons.length];
                      return (
                        <div key={i} className="flex items-start gap-3 bg-stone-50 rounded-xl p-4">
                          <Icon className="h-5 w-5 text-moss-olive flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-stone-800">{perk.label}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{perk.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'Fabric & Material' && (
                <div className="max-w-3xl space-y-4">
                  <h3 className="font-serif font-bold text-xl text-deep-forest">Fabric & Material Details</h3>
                  <div className="overflow-hidden rounded-xl border border-stone-100">
                    {[
                      ['Material', product.metadata?.material || 'Premium Sustainable Blend'],
                      ['Fabric', product.metadata?.fabric || 'Ethically Sourced Fabric'],
                      ['Fit', 'Regular Fit'],
                      ['Pattern', 'Modern / Designer Weave'],
                      ['Wash Care', 'Machine Wash Cold, Gentle Cycle'],
                      ['Origin', 'Made in India 🇮🇳'],
                      ['Sustainable Dyes', 'Eco-friendly, non-toxic'],
                    ].map(([key, val], i) => (
                      <div key={key} className={cn('grid grid-cols-2 gap-4 px-5 py-3.5 text-sm', i % 2 === 0 ? 'bg-stone-50/80' : 'bg-white')}>
                        <span className="font-semibold text-stone-600">{key}</span>
                        <span className="text-stone-800">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Size Guide' && (
                <div className="max-w-2xl space-y-4">
                  <h3 className="font-serif font-bold text-xl text-deep-forest">Size Guide</h3>
                  {product.metadata?.size_guide_html ? (
                    <div className="text-stone-600 leading-relaxed whitespace-pre-line bg-stone-50 p-6 rounded-2xl border border-stone-100">
                      {product.metadata.size_guide_html}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-stone-500">All measurements in centimeters (cm). For the best fit, measure yourself and compare with the chart.</p>
                      <div className="overflow-hidden rounded-xl border border-stone-100">
                        <div className="grid grid-cols-5 bg-stone-50 border-b border-stone-100 text-deep-forest text-[11px] font-bold uppercase tracking-wider">
                          {['Size', 'Chest', 'Waist', 'Hip', 'Length'].map(h => (
                            <div key={h} className="px-4 py-3.5 text-center">{h}</div>
                          ))}
                        </div>
                        {[
                          ['XS', '84', '68', '90', '64'],
                          ['S', '88', '72', '94', '65'],
                          ['M', '92', '76', '98', '66'],
                          ['L', '96', '80', '102', '67'],
                          ['XL', '100', '84', '106', '68'],
                          ['XXL', '104', '88', '110', '69'],
                        ].map(([size, ...rest], i) => (
                          <div key={size} className={cn('grid grid-cols-5 text-sm', i % 2 === 0 ? 'bg-stone-50' : 'bg-white')}>
                            <div className="px-4 py-3 text-center font-bold text-deep-forest">{size}</div>
                            {rest.map((v, j) => (
                              <div key={j} className="px-4 py-3 text-center text-stone-600">{v}</div>
                            ))}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Sizes may vary slightly. When in doubt, size up.
                      </p>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'Shipping & Returns' && (
                <div className="max-w-3xl space-y-6">
                  <h3 className="font-serif font-bold text-xl text-deep-forest">Shipping & Returns Policy</h3>
                  {product.metadata?.shipping_info ? (
                    <div className="text-stone-600 leading-relaxed whitespace-pre-line bg-stone-50 p-6 rounded-2xl border border-stone-100">
                      {product.metadata.shipping_info}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { icon: Truck, title: 'Free Shipping', color: 'text-blue-500 bg-blue-50 border-blue-100', body: 'Free delivery on all orders above ₹999. Standard shipping (5-7 business days) for orders below ₹999.' },
                        { icon: RotateCcw, title: '7-Day Easy Returns', color: 'text-purple-500 bg-purple-50 border-purple-100', body: 'Not happy? Return within 7 days of delivery for a full refund. Item must be unused, in original packaging.' },
                        { icon: ShieldCheck, title: 'Secure Payments', color: 'text-green-500 bg-green-50 border-green-100', body: 'All payments processed through 256-bit encrypted, PCI-DSS compliant payment gateways.' },
                        { icon: Banknote, title: 'Cash on Delivery', color: 'text-orange-500 bg-orange-50 border-orange-100', body: 'COD available at most pincodes across India. A nominal COD fee of ₹40 may apply.' },
                      ].map(({ icon: Icon, title, color, body }) => (
                        <div key={title} className={cn('rounded-xl border p-5 space-y-2', color.split(' ').slice(1).join(' '))}>
                          <div className={cn('flex items-center gap-2', color.split(' ')[0])}>
                            <Icon className="h-5 w-5" />
                            <h4 className="font-bold text-stone-800 text-sm">{title}</h4>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed">{body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Add to Cart */}
      <StickyAddToCart
        product={product}
        selectedVariant={selectedVariant}
        quantity={quantity}
        isAdding={isAdding}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </div>
  );
}
