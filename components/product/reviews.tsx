'use client';

import { useState, useRef } from 'react';
import { Star, Upload, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { submitReview } from '@/lib/actions/review';
import { formatDate } from '@/lib/utils/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Review {
    id: string;
    rating: number;
    title?: string | null;
    comment: string | null;
    images?: string[] | null;
    created_at: string;
    profiles: {
        full_name: string | null;
    };
}

interface ReviewsProps {
    productId: string;
    reviews: Review[];
    user?: any;
}

const AVATAR_COLORS = [
    'bg-deep-forest text-white',
    'bg-moss-olive text-white',
    'bg-raw-clay text-white',
    'bg-oxide-brown text-white',
    'bg-stone-600 text-white',
];

export default function Reviews({ productId, reviews, user }: ReviewsProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = createClient();

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

        setIsUploading(true);
        const newImages: string[] = [];
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // 1. Validate MIME type (specifically block SVG to prevent XSS payloads)
                if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
                    toast.error('Only standard images are allowed (SVGs are blocked for security).');
                    throw new Error('Invalid file type');
                }

                // 2. Validate file extension
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
                    toast.error(`Allowed formats: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}.`);
                    throw new Error('Invalid file extension');
                }

                // 3. Validate file size
                if (file.size > MAX_FILE_SIZE) {
                    toast.error('Maximum allowed image size is 5MB.');
                    throw new Error('File too large');
                }

                const fileName = `${Math.random().toString(36).substring(2, 11)}_${Date.now()}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('review-images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(filePath);
                newImages.push(publicUrl);
            }
            setUploadedImages([...uploadedImages, ...newImages]);
            toast.success('Images uploaded successfully');
        } catch (error) {
            console.error('Error uploading images:', error);
            toast.error('Failed to upload images');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    const removeImage = (index: number) => setUploadedImages(uploadedImages.filter((_, i) => i !== index));

    async function handleSubmit(formData: FormData) {
        if (rating === 0) { toast.error('Please select a rating'); return; }
        setIsSubmitting(true);
        formData.append('productId', productId);
        formData.append('rating', rating.toString());
        formData.append('images', JSON.stringify(uploadedImages));
        const result = await submitReview(formData);
        setIsSubmitting(false);
        if (result.success) {
            toast.success(result.message);
            setRating(0);
            setUploadedImages([]);
            (document.getElementById('review-form') as HTMLFormElement)?.reset();
        } else {
            toast.error(result.message as string);
        }
    }

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length)
        : 0;

    const ratingCounts = [5, 4, 3, 2, 1].map(stars => ({
        stars,
        count: reviews.filter(r => r.rating === stars).length,
        pct: reviews.length > 0 ? (reviews.filter(r => r.rating === stars).length / reviews.length) * 100 : 0,
    }));

    return (
        <div id="reviews" className="mt-14 scroll-mt-24">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                {/* Section header */}
                <div className="px-6 lg:px-10 pt-8 pb-6 border-b border-stone-100">
                    <h2 className="text-2xl font-bold font-serif text-deep-forest">Customer Reviews</h2>
                </div>

                <div className="grid lg:grid-cols-3 gap-0">
                    {/* Rating Summary panel */}
                    <div className="lg:border-r border-stone-100 px-6 lg:px-10 py-8 space-y-6">
                        {/* Big rating number */}
                        <div className="flex items-end gap-4">
                            <span className="text-7xl font-extrabold text-deep-forest leading-none">{averageRating.toFixed(1)}</span>
                            <div className="pb-2 space-y-1">
                                <div className="flex text-amber-400">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star key={star} className={cn('h-5 w-5', star <= Math.round(averageRating) ? 'fill-current' : 'text-stone-200 fill-current')} />
                                    ))}
                                </div>
                                <p className="text-sm text-stone-400">{reviews.length} verified reviews</p>
                            </div>
                        </div>

                        {/* Rating breakdown bars */}
                        <div className="space-y-2.5">
                            {ratingCounts.map(({ stars, count, pct }) => (
                                <div key={stars} className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 w-14 flex-shrink-0">
                                        <span className="text-sm font-medium text-stone-600">{stars}</span>
                                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    </div>
                                    <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-stone-400 w-6 text-right">{count}</span>
                                </div>
                            ))}
                        </div>

                        {/* Write review CTA */}
                        <div className="pt-4 border-t border-stone-100 space-y-3">
                            <h3 className="font-bold text-stone-800">Share your experience</h3>
                            <p className="text-sm text-stone-500">Help other shoppers make the right choice.</p>
                            {!user && (
                                <Button variant="outline" className="w-full border-2 border-deep-forest text-deep-forest hover:bg-deep-forest hover:text-white font-semibold rounded-xl transition-all" asChild>
                                    <a href={`/auth/login?next=/product/${productId}`}>Write a Review</a>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Reviews list + form */}
                    <div className="lg:col-span-2 px-6 lg:px-10 py-8 space-y-8">
                        {/* Review Form */}
                        {user && (
                            <form id="review-form" action={handleSubmit} className="bg-stone-50/80 p-6 rounded-2xl border border-stone-200 space-y-5">
                                <h3 className="text-lg font-bold text-deep-forest">Write a Review</h3>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-stone-700">Your Rating *</label>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className="focus:outline-none transition-transform hover:scale-110"
                                            >
                                                <Star className={cn('h-8 w-8 transition-colors', star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-stone-300')} />
                                            </button>
                                        ))}
                                        {(hoverRating || rating) > 0 && (
                                            <span className="ml-2 text-sm text-stone-500 self-center">
                                                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hoverRating || rating]}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="title" className="block text-sm font-semibold mb-1.5 text-stone-700">Review Title *</label>
                                    <Input name="title" id="title" placeholder="Summarize your experience in a line" required className="bg-white rounded-xl border-stone-200" />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-stone-700">Add Photos</label>
                                    <div className="flex flex-wrap gap-3">
                                        {uploadedImages.map((url, idx) => (
                                            <div key={idx} className="relative w-20 h-20 group rounded-xl overflow-hidden border-2 border-stone-200">
                                                <Image src={url} alt="Review upload" fill className="object-cover" />
                                                <button type="button" onClick={() => removeImage(idx)}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="relative">
                                            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" ref={fileInputRef} disabled={isUploading} />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                                                className="w-20 h-20 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-stone-400 hover:bg-stone-100 transition-all bg-white text-stone-400">
                                                <Upload className="w-5 h-5" />
                                                <span className="text-[10px] font-medium">Add Photo</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="comment" className="block text-sm font-semibold mb-1.5 text-stone-700">Your Review *</label>
                                    <Textarea name="comment" id="comment" placeholder="What did you like or dislike? How was the fit and quality?" required minLength={10} maxLength={1000} className="min-h-[120px] bg-white rounded-xl border-stone-200" />
                                </div>

                                <Button type="submit" disabled={isSubmitting} className="bg-deep-forest hover:bg-deep-forest/90 text-white font-bold rounded-xl px-8">
                                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                </Button>
                            </form>
                        )}

                        {/* Reviews List */}
                        <div className="space-y-6">
                            {reviews.length === 0 ? (
                                <div className="text-center py-16 bg-stone-50 rounded-2xl border border-stone-100">
                                    <Star className="h-10 w-10 text-stone-200 mx-auto mb-3" />
                                    <p className="text-stone-500 font-medium">No reviews yet.</p>
                                    <p className="text-sm text-stone-400 mt-1">Be the first to share your experience!</p>
                                </div>
                            ) : (
                                reviews.map((review, idx) => (
                                    <div key={review.id} className={cn('pb-6', idx < reviews.length - 1 && 'border-b border-stone-100')}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 flex-shrink-0">
                                                    <AvatarFallback className={cn('font-bold text-sm', AVATAR_COLORS[idx % AVATAR_COLORS.length])}>
                                                        {review.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-bold text-stone-800 text-sm">{review.profiles?.full_name || 'Anonymous User'}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                        <span className="text-[11px] text-green-600 font-semibold">Verified Purchase</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-xs text-stone-400 flex-shrink-0">{formatDate(review.created_at)}</span>
                                        </div>

                                        <div className="flex text-amber-400 mb-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} className={cn('h-3.5 w-3.5', star <= review.rating ? 'fill-current' : 'text-stone-200 fill-current')} />
                                            ))}
                                        </div>

                                        {review.title && (
                                            <h4 className="font-bold text-stone-800 mb-1">{review.title}</h4>
                                        )}
                                        <p className="text-sm text-stone-600 leading-relaxed">{review.comment}</p>

                                        {review.images && review.images.length > 0 && (
                                            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                                                {review.images.map((img, i) => (
                                                    <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-stone-200 cursor-pointer hover:opacity-90 transition-opacity">
                                                        <Image src={img} alt={`Review image ${i + 1}`} fill className="object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
