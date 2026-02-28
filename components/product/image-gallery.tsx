'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WishlistButton } from '@/components/product/wishlist-button';

interface ProductImage {
    id: string;
    image_url: string;
    alt_text: string | null;
    display_order: number;
}

interface ImageGalleryProps {
    images: ProductImage[];
    productName: string;
    productId: string;
    isWishlisted: boolean;
}

export function ImageGallery({ images, productName, productId, isWishlisted }: ImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
    const [isZoomed, setIsZoomed] = useState(false);
    const imageRef = useRef<HTMLDivElement>(null);

    // Sort images by display order
    const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!imageRef.current) return;
        const { left, top, width, height } = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setZoomPosition({ x, y });
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % sortedImages.length);
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + sortedImages.length) % sortedImages.length);
    };

    // Keyboard navigation for lightbox
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isLightboxOpen) return;
            if (e.key === 'Escape') setIsLightboxOpen(false);
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLightboxOpen]);

    if (sortedImages.length === 0) {
        return (
            <div className="aspect-[3/4] md:aspect-square bg-stone-50 rounded-lg flex items-center justify-center border border-stone-200">
                <p className="text-stone-400">No images available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 select-none">
            {/* Main Image Area */}
            <div
                className="relative aspect-[3/4] md:aspect-square rounded-lg overflow-hidden bg-white border border-stone-100 group cursor-crosshair"
                ref={imageRef}
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
                onClick={() => setIsLightboxOpen(true)}
            >
                <Image
                    src={sortedImages[selectedIndex].image_url}
                    alt={sortedImages[selectedIndex].alt_text || productName}
                    fill
                    className={cn(
                        "object-cover transition-transform duration-200",
                        // Hide main image when zooming to show the zoomed background instead
                        // But for this simple implementation, we'll keep it and overlay the lens/zoom result
                        // Actually, widely compatible "lens" zoom is tricky without extra divs.
                        // Let's do a simple "scale" zoom or side-by-side zoom for now if complex lens is too much.
                        // We will stick to the "Lens" effect logic:
                    )}
                    priority
                />

                {/* Magnifier Lens / Zoom Result Overlay */}
                {/* On Desktop, we often show a side panel, but for simplicity/mobile-friendly, we can do an internal zoom or just open lightbox */}
                {/* Let's do an "internal" zoom effect where the image scales up greatly at the cursor position */}
                <div
                    className={cn(
                        "absolute inset-0 pointer-events-none transition-opacity duration-200 bg-white",
                        isZoomed ? "opacity-100" : "opacity-0"
                    )}
                    style={{
                        backgroundImage: `url(${sortedImages[selectedIndex].image_url})`,
                        backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                        backgroundSize: '200%', // 2x Zoom
                        backgroundRepeat: 'no-repeat'
                    }}
                />

                {/* Badges / Overlays */}
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <WishlistButton productId={productId} isWishlisted={isWishlisted} />
                </div>

                <div className="absolute bottom-4 right-4 z-20 bg-white/80 backdrop-blur-sm p-2 rounded-full text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <ZoomIn className="h-5 w-5" />
                </div>
            </div>

            {/* Thumbnails */}
            {sortedImages.length > 1 && (
                <div className="relative">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x py-1">
                        {sortedImages.map((image, index) => (
                            <button
                                key={image.id}
                                onClick={() => setSelectedIndex(index)}
                                className={cn(
                                    "relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all snap-start",
                                    selectedIndex === index
                                        ? "border-deep-forest ring-1 ring-deep-forest shadow-md scale-105"
                                        : "border-stone-200 hover:border-stone-400 opacity-70 hover:opacity-100"
                                )}
                            >
                                <Image
                                    src={image.image_url}
                                    alt={image.alt_text || productName}
                                    fill
                                    className="object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Lightbox Modal */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsLightboxOpen(false)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50"
                        >
                            <X className="h-8 w-8" />
                        </button>

                        {/* Navigation Buttons */}
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-50 hidden md:block"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </button>

                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-50 hidden md:block"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </button>

                        {/* Main Lightbox Image */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image
                                src={sortedImages[selectedIndex].image_url}
                                alt={sortedImages[selectedIndex].alt_text || productName}
                                fill
                                className="object-contain"
                                quality={100}
                                priority
                            />
                        </motion.div>

                        {/* Counter */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-medium">
                            {selectedIndex + 1} / {sortedImages.length}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
