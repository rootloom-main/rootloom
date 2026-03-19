import Link from 'next/link';
import Image from 'next/image';

interface PromoBannerProps {
    banner?: {
        id: string;
        title: string;
        image_url: string;
        link?: string | null;
        collections?: {
            slug: string;
        } | null;
    };
}

export default function PromoBanner({ banner }: PromoBannerProps) {
    if (!banner) return null;

    const content = (
        <div className="block relative w-full h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] overflow-hidden group">
            <Image
                src={banner.image_url}
                alt={banner.title}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1200px) 100vw, 1200px"
            />
            {/* Elegant Overlay */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-500 flex flex-col items-center justify-center p-6 text-center">
                <h3 className="text-white text-3xl md:text-5xl font-serif font-bold tracking-tight drop-shadow-lg mb-2 transform transition-all duration-500 group-hover:scale-105">
                    {banner.title}
                </h3>
                {(banner as any).description && (
                    <p className="text-heirloom-white/90 text-sm md:text-lg max-w-xl font-light opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100">
                        {(banner as any).description}
                    </p>
                )}
            </div>
        </div>
    );

    const bannerLink = banner.collections?.slug 
        ? `/collections/${banner.collections.slug}` 
        : banner.link;

    return (
        <section className="w-full my-8 md:my-16">
            <div className="container mx-auto px-4">
                {bannerLink ? (
                    <Link href={bannerLink} className="block rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500">
                        {content}
                    </Link>
                ) : (
                    <div className="block rounded-xl overflow-hidden shadow-sm">
                        {content}
                    </div>
                )}
            </div>
        </section>
    );
}
