import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';

export default async function Home() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .limit(4);

  const { data: featuredProducts } = await supabase
    .from('products')
    .select('id, name, slug, base_price, product_images(image_url, alt_text)')
    .eq('featured', true)
    .limit(8);

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
      <section className="relative h-screen min-h-[600px] w-full overflow-hidden bg-heirloom-white">
        <div className="flex h-full flex-col md:flex-row">
          <div className="relative h-[50vh] w-full md:h-full md:w-1/2">
            <Image
              src="/hero.png"
              alt="Man in beige jacket looking away"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex h-[50vh] w-full flex-col justify-center px-8 md:h-full md:w-1/2 md:px-16 lg:px-24">
            <div className="max-w-xl">
              <h1 className="mb-6 font-serif text-5xl font-medium leading-tight text-deep-forest md:text-6xl lg:text-7xl">
                Crafted from
                <br />
                the Ground Up.
              </h1>
              <p className="mb-10 text-lg text-slate-bark md:text-xl">
                Rooted in heritage. Woven for today.
              </p>
              <Link
                href="/shop"
                className="group inline-flex items-center text-lg font-medium text-raw-clay hover:text-oxide-brown transition-colors"
              >
                Explore the Collection
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

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

      <section className="py-16 bg-linen-wash">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-deep-forest">
            What Our Customers Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-stone-paper border-none">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-raw-clay text-raw-clay"
                      />
                    ))}
                  </div>
                  <p className="text-slate-bark mb-4">{testimonial.comment}</p>
                  <p className="font-semibold text-deep-forest">{testimonial.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-deep-forest text-heirloom-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-serif font-bold mb-4">Join Our Style Community</h2>
          <p className="text-xl mb-8 text-ash-white">
            Get exclusive offers and be the first to know about new arrivals
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-4 py-3 rounded-lg text-deep-forest bg-stone-paper flex-1 placeholder:text-slate-bark/50 focus:outline-none focus:ring-1 focus:ring-woven-sand"
            />
            <Button size="lg" className="bg-heirloom-white text-deep-forest hover:bg-stone-paper">
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
