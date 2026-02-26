'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/components/providers/cart-provider';
import { usePostHog } from 'posthog-js/react';
import { formatPrice } from '@/lib/utils/format';
import { Minus, Plus, ShoppingCart, ChevronLeft, Truck, ShieldCheck, Award, ArchiveRestore, Globe, Star, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { createClient } from '@/lib/supabase/client';
import { SizeGuide } from '@/components/product/size-guide';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ImageGallery } from '@/components/product/image-gallery';
import { DeliveryChecker } from '@/components/product/delivery-checker';
import { ProductSpecs } from '@/components/product/product-specs';
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
}

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
  const router = useRouter();
  const { addToCart } = useCart();
  const supabase = createClient();
  const posthog = usePostHog();

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (posthog) {
      posthog.capture('product_viewed', {
        product_id: product.id,
        product_name: product.name,
        price: product.base_price,
        category: product.category?.name
      });
    }
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

      // Remove if exists
      viewedProducts = viewedProducts.filter((p: any) => p.id !== product.id);

      // Add to front
      viewedProducts.unshift(newProduct);

      // Keep only last 10
      viewedProducts = viewedProducts.slice(0, 10);

      localStorage.setItem('recentlyViewed', JSON.stringify(viewedProducts));
    } catch (e) {
      console.error('Failed to save recently viewed', e);
    }
  }, [product]);

  const uniqueSizes = Array.from(new Set(product.product_variants.map((v) => v.size)));
  const uniqueColors = Array.from(new Set(product.product_variants.map((v) => v.color)));

  const availableColors = selectedSize
    ? Array.from(
      new Set(
        product.product_variants
          .filter((v) => v.size === selectedSize && v.stock > 0)
          .map((v) => v.color)
      )
    )
    : uniqueColors;

  const availableSizes = selectedColor
    ? Array.from(
      new Set(
        product.product_variants
          .filter((v) => v.color === selectedColor && v.stock > 0)
          .map((v) => v.size)
      )
    )
    : uniqueSizes;

  const selectedVariant = product.product_variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );

  const finalPrice = selectedVariant
    ? product.base_price + selectedVariant.price_adjustment
    : product.base_price;

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      toast.error('Please select size and color');
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please login to add items to cart');
      router.push('/auth/login');
      return;
    }

    setIsAdding(true);
    try {
      if (posthog) {
        posthog.capture('added_to_cart', {
          product_id: product.id,
          product_name: product.name,
          variant_id: selectedVariant.id,
          size: selectedSize,
          color: selectedColor,
          price: finalPrice,
          quantity: quantity
        });
      }
      await addToCart(product.id, selectedVariant.id, quantity);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/shop"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Shop
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* New Image Gallery */}
        <div className="space-y-4">
          <ImageGallery
            images={product.product_images}
            productName={product.name}
            productId={product.id}
            isWishlisted={isWishlisted}
          />
        </div>

        {/* Product Info & Buy Box */}
        <div className="space-y-6">
          <div className="space-y-2 border-b border-stone-100 pb-4">
            {product.category && (
              <Link
                href={`/shop?category=${product.category.slug}`}
                className="text-sm font-medium text-moss-olive hover:underline tracking-wide uppercase"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="text-3xl lg:text-4xl font-bold text-deep-forest font-serif leading-tight">{product.name}</h1>

            {/* Rating Summary (New Location) */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex text-amber-500">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={cn("w-4 h-4", i <= Math.round(averageRating || 0) ? "fill-current" : "text-stone-200")} />
                ))}
              </div>
              <span className="text-sm font-medium text-stone-700">{averageRating?.toFixed(1)}</span>
              <span className="text-sm text-stone-400">•</span>
              <a href="#reviews" className="text-sm text-blue-600 hover:underline">{totalReviews} reviews</a>
            </div>

            {/* Price Block */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold text-deep-forest">{formatPrice(finalPrice)}</span>
              {selectedVariant && selectedVariant.price_adjustment > 0 && (
                <span className="text-sm text-stone-500 line-through">{formatPrice(product.base_price)}</span>
              )}
            </div>
            <p className="text-sm text-stone-500">Inclusive of all taxes</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Options Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Bank Offers */}
              <div className="bg-green-50/50 border border-green-100 p-4 rounded-md">
                <h4 className="flex items-center gap-2 font-bold text-sm text-deep-forest mb-2">
                  <span className="text-green-600">%</span> Bank Offers
                </h4>
                <ul className="text-sm text-stone-600 space-y-1 list-disc pl-4">
                  <li>10% Instant Discount on HDFC Bank Credit Cards.</li>
                  <li>5% Unlimited Cashback on Flipkart Axis Bank Credit Card.</li>
                </ul>
              </div>

              {/* Color Selection */}
              <div>
                <Label className="mb-3 block text-sm font-bold text-stone-700">Color: <span className="font-normal text-stone-600">{selectedColor}</span></Label>
                <RadioGroup value={selectedColor} onValueChange={setSelectedColor}>
                  <div className="flex gap-3 flex-wrap">
                    {uniqueColors.map((color) => {
                      const isAvailable = availableColors.includes(color);
                      return (
                        <div key={color}>
                          <RadioGroupItem
                            value={color}
                            id={`color-${color}`}
                            className="peer sr-only"
                            disabled={!isAvailable}
                          />
                          <Label
                            htmlFor={`color-${color}`}
                            className={`flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer text-sm font-medium transition-all
                                    peer-data-[state=checked]:border-deep-forest peer-data-[state=checked]:bg-stone-50 peer-data-[state=checked]:text-deep-forest peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-deep-forest
                                    ${!isAvailable
                                ? 'opacity-50 cursor-not-allowed bg-stone-50 text-stone-300'
                                : 'hover:border-stone-400 border-stone-200 text-stone-700'
                              }`}
                          >
                            {color}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              {/* Size Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="block text-sm font-bold text-stone-700">Size: <span className="font-normal text-stone-600">{selectedSize}</span></Label>
                  <SizeGuide />
                </div>
                <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                  <div className="flex gap-3 flex-wrap">
                    {uniqueSizes.map((size) => {
                      const isAvailable = availableSizes.includes(size);
                      return (
                        <div key={size}>
                          <RadioGroupItem
                            value={size}
                            id={`size-${size}`}
                            className="peer sr-only"
                            disabled={!isAvailable}
                          />
                          <Label
                            htmlFor={`size-${size}`}
                            className={`flex items-center justify-center w-12 h-12 border rounded-md cursor-pointer text-sm font-medium transition-all
                                    peer-data-[state=checked]:border-deep-forest peer-data-[state=checked]:bg-deep-forest peer-data-[state=checked]:text-white
                                    ${!isAvailable
                                ? 'opacity-50 cursor-not-allowed bg-stone-50 text-stone-300 dashed-border'
                                : 'hover:border-deep-forest border-stone-200 text-stone-700'
                              }`}
                          >
                            {size}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              {/* Delivery Checker */}
              <DeliveryChecker />

              {/* Description */}
              {product.description && (
                <div className="pt-6 border-t border-stone-100">
                  <h3 className="font-bold text-lg mb-3 text-deep-forest">About this item</h3>
                  <p className="text-stone-600 leading-relaxed text-sm lg:text-base">{product.description}</p>
                </div>
              )}

              {/* Product Specs */}
              <ProductSpecs category={product.category?.name || 'Apparel'} description={product.description} />

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Award className="h-4 w-4 text-moss-olive" /> <span>Authentic Quality</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <Globe className="h-4 w-4 text-moss-olive" /> <span>Ethically Sourced</span>
                </div>
              </div>
            </div>

            {/* Buy Box Column (Right Side on Desktop) */}
            <div className="lg:col-span-1">
              <div className="border border-stone-200 rounded-lg p-6 bg-white shadow-sm sticky top-24">
                {selectedVariant ? (
                  <div className="space-y-4">
                    <div className="text-xl font-bold text-deep-forest">{formatPrice(finalPrice)}</div>

                    {selectedVariant.stock > 0 ? (
                      <div className="space-y-1">
                        <div className="text-green-600 font-medium text-lg">In Stock</div>
                        {selectedVariant.stock < 10 && (
                          <div className="text-red-600 text-sm font-medium">Only {selectedVariant.stock} left in stock - order soon.</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-600 font-medium text-lg">Currently Unavailable</div>
                    )}

                    <div className="space-y-3">
                      <Label className="text-sm">Quantity:</Label>
                      <div className="flex items-center border border-stone-300 rounded-md w-max">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="px-3 py-1 hover:bg-stone-100 border-r border-stone-300 text-stone-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-4 py-1 font-medium text-stone-800">{quantity}</span>
                        <button
                          onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
                          disabled={quantity >= selectedVariant.stock}
                          className="px-3 py-1 hover:bg-stone-100 border-l border-stone-300 text-stone-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div id="primary-add-to-cart" className="space-y-3 pt-2">
                      <Button
                        size="lg"
                        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black rounded-full shadow-sm"
                        onClick={handleAddToCart}
                        disabled={selectedVariant.stock === 0 || isAdding}
                      >
                        {isAdding ? 'Adding...' : 'Add to Cart'}
                      </Button>
                      <Button
                        size="lg"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-sm"
                        onClick={() => {
                          handleAddToCart().then(() => router.push('/checkout'));
                        }}
                        disabled={selectedVariant.stock === 0 || isAdding}
                      >
                        Buy Now
                      </Button>
                    </div>

                    <div className="text-xs text-stone-500 space-y-2 pt-4 border-t border-stone-100">
                      <div className="grid grid-cols-2">
                        <span>Ships from</span> <span className="text-stone-900 justify-self-end text-right">Root & Loom</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span>Sold by</span> <span className="text-stone-900 justify-self-end text-right">Root & Loom</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-stone-500 italic text-center py-4">
                    Select size and color to see availability
                  </div>
                )}

                {/* Security Text */}
                <div className="flex items-center gap-2 mt-6 text-xs text-stone-500 border-t border-stone-100 pt-4">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Secure transaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Add to Cart (Mobile) */}
      <StickyAddToCart
        product={product}
        selectedVariant={selectedVariant}
        isAdding={isAdding}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

function getDeliveryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
