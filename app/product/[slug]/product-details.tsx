'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/components/providers/cart-provider';
import { formatPrice } from '@/lib/utils/format';
import { Minus, Plus, ShoppingCart, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { SizeGuide } from '@/components/product/size-guide';

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

import { WishlistButton } from '@/components/product/wishlist-button';

// ... interface definitions ...

export function ProductDetails({ product, isWishlisted = false }: { product: Product; isWishlisted?: boolean }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const supabase = createClient();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const sortedImages = [...product.product_images].sort(
    (a, b) => a.display_order - b.display_order
  );

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

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-stone-paper">
            {sortedImages.length > 0 ? (
              <Image
                src={sortedImages[selectedImage]?.image_url}
                alt={sortedImages[selectedImage]?.alt_text || product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No image available</p>
              </div>
            )}
          </div>

          {sortedImages.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {sortedImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 ${selectedImage === index ? 'border-deep-forest' : 'border-woven-sand'
                    }`}
                >
                  <Image
                    src={image.image_url}
                    alt={image.alt_text || product.name}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {product.category && (
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="text-sm text-moss-olive hover:text-deep-forest"
            >
              {product.category.name}
            </Link>
          )}

          <div>
            <h1 className="text-3xl font-bold mb-2 text-deep-forest">{product.name}</h1>
            <p className="text-2xl font-semibold text-deep-forest">{formatPrice(finalPrice)}</p>
          </div>

          {product.description && (
            <div>
              <h3 className="font-semibold mb-2 text-deep-forest">Description</h3>
              <p className="text-slate-bark">{product.description}</p>
            </div>
          )}



          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-deep-forest">Size</Label>
              <SizeGuide />
            </div>
            <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
              <div className="flex gap-2 flex-wrap">
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
                        className={`flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer peer-data-[state=checked]:border-deep-forest peer-data-[state=checked]:bg-deep-forest peer-data-[state=checked]:text-heirloom-white ${!isAvailable
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-oxide-brown border-woven-sand text-slate-bark'
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

          <div>
            <Label className="mb-3 block text-deep-forest">Color</Label>
            <RadioGroup value={selectedColor} onValueChange={setSelectedColor}>
              <div className="flex gap-2 flex-wrap">
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
                        className={`flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer peer-data-[state=checked]:border-deep-forest peer-data-[state=checked]:bg-deep-forest peer-data-[state=checked]:text-heirloom-white ${!isAvailable
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:border-oxide-brown border-woven-sand text-slate-bark'
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

          {selectedVariant && (
            <div className="flex items-center gap-4">
              <Badge variant={selectedVariant.stock > 0 ? 'default' : 'destructive'} className={selectedVariant.stock > 0 ? "bg-olive-earth hover:bg-olive-earth/90" : "bg-burnt-umber hover:bg-burnt-umber/90"}>
                {selectedVariant.stock > 0
                  ? `${selectedVariant.stock} in stock`
                  : 'Out of stock'}
              </Badge>
              {selectedVariant.sku && (
                <span className="text-sm text-moss-olive">SKU: {selectedVariant.sku}</span>
              )}
            </div>
          )}

          <div>
            <Label className="mb-3 block text-deep-forest">Quantity</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-woven-sand rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="text-deep-forest hover:text-deep-forest hover:bg-stone-paper"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 min-w-[3rem] text-center text-deep-forest">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setQuantity(
                      Math.min(selectedVariant?.stock || 999, quantity + 1)
                    )
                  }
                  disabled={!selectedVariant || quantity >= selectedVariant.stock}
                  className="text-deep-forest hover:text-deep-forest hover:bg-stone-paper"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full border-2 border-deep-forest text-deep-forest bg-transparent hover:bg-deep-forest hover:text-heirloom-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddToCart}
            disabled={
              Boolean(!selectedVariant && selectedSize && selectedColor) ||
              Boolean(selectedVariant && selectedVariant.stock === 0) ||
              isAdding
            }
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isAdding
              ? 'Adding...'
              : !selectedSize || !selectedColor
                ? 'Add to Cart'
                : selectedVariant?.stock === 0
                  ? 'Out of Stock'
                  : 'Add to Cart'}
          </Button>

          <div className="flex justify-center mt-4">
            <WishlistButton productId={product.id} isWishlisted={isWishlisted} variant="full" />
          </div>
        </div>
      </div>
    </div>
  );
}
