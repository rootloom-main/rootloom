import Link from 'next/link';
import Image from 'next/image';

interface PromoBannerProps {
    banner?: {
        id: string;
        title: string;
        image_url: string;
        link?: string | null;
    };
}

export function PromoBanner({ banner }: PromoBannerProps) {
    if (!banner) return null;

    const content = (
        <div className="block relative w-full h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] overflow-hidden group">
            <Image
                src={banner.image_url}
                alt={banner.title}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1200px) 100vw, 1200vw"
            />
            {/* Subtle Overlay to make it distinct */}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
                <h3 className="text-white text-2xl md:text-4xl font-serif font-bold tracking-wider drop-shadow-md opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">{banner.title}</h3>
            </div>
        </div>
    );

    return (
        <section className="w-full my-8 md:my-16">
            <div className="container mx-auto px-4">
                {banner.link ? (
                    <Link href={banner.link} className="block rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-500">
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
