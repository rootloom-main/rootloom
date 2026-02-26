'use client';

import { useState, useRef } from 'react';
import { Star, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { submitReview } from '@/lib/actions/review';
import { formatDate } from '@/lib/utils/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
// import { Progress } from '@/components/ui/progress'; // Replaced with custom div to avoid build error
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

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

export function Reviews({ productId, reviews, user }: ReviewsProps) {
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

        setIsUploading(true);
        const newImages: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('review-images')
                    .getPublicUrl(filePath);

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

    const removeImage = (index: number) => {
        setUploadedImages(uploadedImages.filter((_, i) => i !== index));
    };

    async function handleSubmit(formData: FormData) {
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        formData.append('productId', productId);
        formData.append('rating', rating.toString());
        // Append images as a JSON string to be parsed on server
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

    const averageRating =
        reviews.length > 0
            ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
            : '0.0';

    return (
        <div id="reviews" className="space-y-12 mt-16 scroll-mt-24">
            <div className="grid md:grid-cols-3 gap-12">
                {/* Review Summary */}
                <div className="md:col-span-1 space-y-6">
                    <h2 className="text-2xl font-bold font-serif text-deep-forest">Customer Reviews</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex text-yellow-400">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-6 w-6 ${star <= Number(averageRating) ? 'fill-current' : 'text-stone-200 fill-none'}`}
                                />
                            ))}
                        </div>
                        <span className="text-3xl font-bold text-deep-forest">{averageRating}</span>
                    </div>
                    <p className="text-stone-500">Based on {reviews.length} reviews</p>

                    {/* Rating Breakdown */}
                    <div className="space-y-2 mt-4">
                        {[5, 4, 3, 2, 1].map((stars) => {
                            const count = reviews.filter(r => r.rating === stars).length;
                            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                            return (
                                <div key={stars} className="flex items-center gap-2 text-sm">
                                    <span className="w-12 text-stone-600">{stars} stars</span>
                                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-deep-forest" style={{ width: `${percentage}%` }} />
                                    </div>
                                    <span className="w-8 text-right text-stone-400">{percentage.toFixed(0)}%</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-6 border-t border-stone-100">
                        <h3 className="font-bold text-lg mb-2">Review this product</h3>
                        <p className="text-stone-500 text-sm mb-4">Share your thoughts with other customers</p>
                        {!user && (
                            <Button variant="outline" className="w-full" asChild>
                                <a href={`/auth/login?next=/product/${productId}`}>Write a Review</a>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Reviews List & Form */}
                <div className="md:col-span-2 space-y-10">
                    {/* Review Form */}
                    {user && (
                        <form id="review-form" action={handleSubmit} className="bg-stone-50 p-6 rounded-lg border border-stone-100 space-y-6">
                            <h3 className="text-lg font-bold text-deep-forest">Write a Review</h3>

                            {/* Rating Input */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-stone-700">Overall Rating</label>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            type="button"
                                            key={star}
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={`h-8 w-8 ${star <= (hoverRating || rating)
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-stone-300'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title Input */}
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium mb-1 text-stone-700">Review Title</label>
                                <Input
                                    name="title"
                                    id="title"
                                    placeholder="Summarize your thoughts"
                                    required
                                    className="bg-white"
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-2 text-stone-700">Add Photos</label>
                                <div className="flex flex-wrap gap-4">
                                    {uploadedImages.map((url, idx) => (
                                        <div key={idx} className="relative w-20 h-20 group">
                                            <Image
                                                src={url}
                                                alt="Review upload"
                                                fill
                                                className="object-cover rounded-md border border-stone-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            ref={fileInputRef}
                                            disabled={isUploading}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-20 h-20 border-dashed flex flex-col items-center justify-center bg-white"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                        >
                                            {isUploading ? (
                                                <span className="loading loading-spinner loading-xs">...</span>
                                            ) : (
                                                <Upload className="w-5 h-5 text-stone-400" />
                                            )}
                                            <span className="text-[10px] text-stone-500 mt-1">Add</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Comment Input */}
                            <div>
                                <label htmlFor="comment" className="block text-sm font-medium mb-1 text-stone-700">
                                    Your Review
                                </label>
                                <Textarea
                                    name="comment"
                                    id="comment"
                                    placeholder="What did you like or dislike? How was the fit?"
                                    required
                                    minLength={10}
                                    maxLength={1000}
                                    className="min-h-[120px] bg-white"
                                />
                            </div>

                            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-deep-forest hover:bg-deep-forest/90">
                                {isSubmitting ? 'Submitting Review...' : 'Submit Review'}
                            </Button>
                        </form>
                    )}

                    {/* Reviews List */}
                    <div className="space-y-8">
                        {reviews.length === 0 ? (
                            <div className="text-center py-12 bg-stone-50 rounded-lg">
                                <p className="text-stone-500 italic">No reviews yet. Be the first to share your experience!</p>
                            </div>
                        ) : (
                            reviews.map((review) => (
                                <div key={review.id} className="border-b border-stone-100 pb-8 last:border-0">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-stone-200">
                                                <AvatarFallback className="bg-stone-100 text-stone-600 font-bold">
                                                    {review.profiles?.full_name?.charAt(0) || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-semibold text-deep-forest">
                                                    {review.profiles?.full_name || 'Anonymous User'}
                                                </div>
                                                <div className="text-xs text-stone-500">Verified Purchase</div>
                                            </div>
                                        </div>
                                        <span className="text-sm text-stone-400">
                                            {formatDate(review.created_at)}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <div className="flex text-yellow-400 mb-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`h-4 w-4 ${star <= review.rating ? 'fill-current' : 'text-stone-200 fill-none'}`}
                                                />
                                            ))}
                                        </div>
                                        {review.title && (
                                            <h4 className="font-bold text-lg text-deep-forest">{review.title}</h4>
                                        )}
                                    </div>

                                    <p className="text-stone-700 leading-relaxed mb-4">{review.comment}</p>

                                    {review.images && review.images.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {review.images.map((img, i) => (
                                                <div key={i} className="relative w-24 h-24 flex-shrink-0 cursor-pointer border border-stone-200 rounded-md overflow-hidden">
                                                    <Image
                                                        src={img}
                                                        alt={`Review image ${i + 1}`}
                                                        fill
                                                        className="object-cover hover:scale-105 transition-transform"
                                                    />
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
    );
}
