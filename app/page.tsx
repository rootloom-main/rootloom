import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { HeroSection } from '@/components/home/hero-section';

export default async function Home() {
  const supabase = await createClient();

  const [categoriesResult, featuredProductsResult] = await Promise.all([
    supabase.from('categories').select('*').limit(4),
    supabase
      .from('products')
      .select('id, name, slug, base_price, product_images(image_url, alt_text)')
      .eq('featured', true)
      .limit(8),
  ]);

  const categories = categoriesResult.data;
  const featuredProducts = featuredProductsResult.data;

  const features = [
    {
      icon: Truck,
      title: 'Free Shipping',
      description: 'On orders above ₹999',
    },
    {
      icon: RefreshCw,
      title: 'Easy Returns',
      description: '30-day return policy',
    },
    {
      icon: Shield,
      title: 'Secure Payment',
      description: '100% secure transactions',
    },
    {
      icon: Star,
      title: 'Premium Quality',
      description: 'Curated collections',
    },
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      rating: 5,
      comment:
        'Amazing quality and perfect fit! The delivery was super fast. Will definitely order again.',
    },
    {
      name: 'Rahul Verma',
      rating: 5,
      comment:
        'Great collection and excellent customer service. Highly recommend Root&Loom!',
    },
    {
      name: 'Anita Desai',
      rating: 5,
      comment:
        'Love the fabric quality and designs. Worth every penny!',
    },
  ];

  return (
    <div>
      <HeroSection />

      <section className="py-16 bg-heirloom-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-paper mb-4 text-deep-forest">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="font-semibold mb-2 text-deep-forest">{feature.title}</h3>
                <p className="text-sm text-slate-bark">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-linen-wash">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-deep-forest">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories?.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-stone-paper border-none">
                  <div className="relative aspect-square">
                    <Image
                      src={category.image_url || ''}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <CardContent className="p-4 text-center">
                    <h3 className="font-semibold text-deep-forest">{category.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-heirloom-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-deep-forest">Featured Products</h2>
            <Link href="/shop">
              <Button variant="outline" className="border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-heirloom-white">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featuredProducts?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
