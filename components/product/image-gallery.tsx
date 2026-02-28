'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
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
    const [direction, setDirection] = useState(0); // -1 = prev, 1 = next
    const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
    const [isZoomed, setIsZoomed] = useState(false);

    const mainImageRef = useRef<HTMLDivElement>(null);
    const thumbnailsRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

    const goTo = useCallback((index: number, dir?: number) => {
        const d = dir ?? (index > selectedIndex ? 1 : -1);
        setDirection(d);
        setSelectedIndex(index);
    }, [selectedIndex]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (sortedImages.length <= 1) return;
        goTo((selectedIndex + 1) % sortedImages.length, 1);
    }, [selectedIndex, sortedImages.length, goTo]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (sortedImages.length <= 1) return;
        goTo((selectedIndex - 1 + sortedImages.length) % sortedImages.length, -1);
    }, [selectedIndex, sortedImages.length, goTo]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') setIsLightboxOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

    // Auto-scroll thumbnail into view
    useEffect(() => {
        const container = thumbnailsRef.current;
        if (!container) return;
        const thumb = container.children[selectedIndex] as HTMLElement;
        if (!thumb) return;
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, [selectedIndex]);

    // Touch swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            dx < 0 ? handleNext() : handlePrev();
        }
        touchStartX.current = null;
        touchStartY.current = null;
    };

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!mainImageRef.current) return;
        const { left, top, width, height } = mainImageRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
        setZoomPos({ x, y });
    }, []);

    if (sortedImages.length === 0) {
        return (
            <div className="aspect-[4/5] bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-200">
                <p className="text-stone-400">No images available</p>
            </div>
        );
    }

    const currentImg = sortedImages[selectedIndex];

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
    };

    return (
        <div className="select-none space-y-0">
            {/* ─── Main image frame ─── */}
            <div className="relative">
                <div
                    ref={mainImageRef}
                    className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 cursor-zoom-in group"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsZoomed(true)}
                    onMouseLeave={() => setIsZoomed(false)}
                    onClick={() => setIsLightboxOpen(true)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Sliding image */}
                    <AnimatePresence initial={false} custom={direction}>
                        <motion.div
                            key={selectedIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 340, damping: 36, mass: 0.8 }}
                            className="absolute inset-0"
                        >
                            <Image
                                src={currentImg.image_url}
                                alt={currentImg.alt_text || productName}
                                fill
                                className="object-cover"
                                priority
                                draggable={false}
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* Hover zoom overlay — desktop only */}
                    <div
                        className={cn(
                            'absolute inset-0 pointer-events-none transition-opacity duration-150 hidden lg:block',
                            isZoomed ? 'opacity-100' : 'opacity-0'
                        )}
                        style={{
                            backgroundImage: `url(${currentImg.image_url})`,
                            backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                            backgroundSize: '220%',
                            backgroundRepeat: 'no-repeat',
                        }}
                    />

                    {/* Wishlist */}
                    <div className="absolute top-3 right-3 z-20">
                        <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md">
                            <WishlistButton productId={productId} isWishlisted={isWishlisted} />
                        </div>
                    </div>

                    {/* Zoom hint */}
                    <div className="absolute bottom-3 right-3 z-10 bg-black/30 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex">
                        <ZoomIn className="h-3 w-3" /> Hover to zoom
                    </div>

                    {/* Prev / Next arrows — show when multiple images */}
                    {sortedImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 bg-white/85 hover:bg-white backdrop-blur-sm w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
                                aria-label="Previous image"
                            >
                                <ChevronLeft className="h-4 w-4 text-stone-700" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 bg-white/85 hover:bg-white backdrop-blur-sm w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
                                aria-label="Next image"
                            >
                                <ChevronRight className="h-4 w-4 text-stone-700" />
                            </button>
                        </>
                    )}

                    {/* Dot indicator — bottom center */}
                    {sortedImages.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                            {sortedImages.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); goTo(i); }}
                                    className={cn(
                                        'rounded-full transition-all duration-250',
                                        i === selectedIndex
                                            ? 'bg-white w-5 h-2 shadow'
                                            : 'bg-white/50 w-2 h-2 hover:bg-white/80'
                                    )}
                                    aria-label={`Image ${i + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Thumbnail strip ─── */}
            {sortedImages.length > 1 && (
                <div className="mt-3 relative">
                    {/* Left scroll fade */}
                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-stone-50 to-transparent z-10 pointer-events-none rounded-l-xl" />
                    {/* Right scroll fade */}
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-stone-50 to-transparent z-10 pointer-events-none rounded-r-xl" />

                    <div
                        ref={thumbnailsRef}
                        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth px-1 py-1"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                        {sortedImages.map((image, index) => (
                            <button
                                key={image.id}
                                onClick={() => goTo(index)}
                                className={cn(
                                    'relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200',
                                    'w-16 h-16 sm:w-[72px] sm:h-[72px]',
                                    index === selectedIndex
                                        ? 'border-deep-forest shadow-md scale-105 ring-1 ring-deep-forest/30'
                                        : 'border-stone-200 hover:border-stone-400 opacity-55 hover:opacity-100 hover:scale-102'
                                )}
                                aria-label={`View image ${index + 1}`}
                            >
                                <Image
                                    src={image.image_url}
                                    alt={image.alt_text || `${productName} ${index + 1}`}
                                    fill
                                    className="object-cover"
                                />
                                {/* Active highlight overlay */}
                                {index === selectedIndex && (
                                    <div className="absolute inset-0 bg-deep-forest/5" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Lightbox ─── */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/97 backdrop-blur-lg flex flex-col items-center justify-center"
                        onClick={() => setIsLightboxOpen(false)}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Close */}
                        <button
                            onClick={() => setIsLightboxOpen(false)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full z-50 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        {/* Counter */}
                        <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium z-50">
                            {selectedIndex + 1} / {sortedImages.length}
                        </div>

                        {/* Prev / Next */}
                        {sortedImages.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full z-50 transition-colors hidden sm:flex">
                                    <ChevronLeft className="h-7 w-7" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full z-50 transition-colors hidden sm:flex">
                                    <ChevronRight className="h-7 w-7" />
                                </button>
                            </>
                        )}

                        {/* Main lightbox image with slide animation */}
                        <div
                            className="w-full max-w-3xl max-h-[82vh] relative flex items-center justify-center overflow-hidden px-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.div
                                    key={selectedIndex}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 340, damping: 36, mass: 0.8 }}
                                    className="absolute inset-0"
                                >
                                    <Image
                                        src={currentImg.image_url}
                                        alt={currentImg.alt_text || productName}
                                        fill
                                        className="object-contain"
                                        quality={95}
                                        priority
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Bottom thumbnail strip in lightbox */}
                        {sortedImages.length > 1 && (
                            <div className="absolute bottom-4 left-0 right-0 px-4">
                                <div className="flex gap-2 justify-center overflow-x-auto scrollbar-hide">
                                    {sortedImages.map((img, i) => (
                                        <button
                                            key={img.id}
                                            onClick={(e) => { e.stopPropagation(); goTo(i); }}
                                            className={cn(
                                                'relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                                                i === selectedIndex
                                                    ? 'border-white opacity-100 scale-110'
                                                    : 'border-white/20 opacity-40 hover:opacity-70'
                                            )}
                                        >
                                            <Image src={img.image_url} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
