import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';

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

  return (
    <Link href={`/product/${product.slug}`} className="group">
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-stone-paper">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-sm line-clamp-2 text-deep-forest group-hover:text-oxide-brown transition-colors">
            {product.name}
          </h3>
          <p className="text-sm font-semibold text-slate-bark">{formatPrice(product.base_price)}</p>
        </div>
      </div>
    </Link>
  );
}
