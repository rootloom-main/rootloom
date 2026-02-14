'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { submitReview } from '@/lib/actions/review';
import { formatDate } from '@/lib/utils/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface Review {
    id: string;
    rating: number;
    comment: string | null;
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

    async function handleSubmit(formData: FormData) {
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        formData.append('productId', productId);
        formData.append('rating', rating.toString());

        const result = await submitReview(formData);
        setIsSubmitting(false);

        if (result.success) {
            toast.success(result.message);
            setRating(0);
            // Ideally reset the form here, but for now we rely on hydration/revalidation
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
        <div className="space-y-8 mt-12">
            <h2 className="text-2xl font-bold">Customer Reviews</h2>

            <div className="flex items-center gap-4">
                <div className="flex items-center">
                    {/* Show average stars */}
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`h-5 w-5 ${star <= Number(averageRating)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`}
                        />
                    ))}
                </div>
                <span className="text-lg font-medium">{averageRating} out of 5</span>
                <span className="text-gray-500">({reviews.length} reviews)</span>
            </div>

            <Separator />

            <div className="space-y-6">
                {reviews.map((review) => (
                    <div key={review.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    {review.profiles?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">
                                {review.profiles?.full_name || 'Anonymous User'}
                            </span>
                            <span className="text-sm text-gray-500">
                                {formatDate(review.created_at)}
                            </span>
                        </div>
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                        <Separator className="mt-4" />
                    </div>
                ))}
                {reviews.length === 0 && (
                    <p className="text-gray-500 italic">No reviews yet. Be the first to review!</p>
                )}
            </div>

            {user ? (
                <form id="review-form" action={handleSubmit} className="space-y-4 border p-6 rounded-lg bg-gray-50">
                    <h3 className="text-lg font-semibold">Write a Review</h3>
                    <div>
                        <label className="block text-sm font-medium mb-1">Rating</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    type="button"
                                    key={star}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="focus:outline-none"
                                >
                                    <Star
                                        className={`h-6 w-6 ${star <= (hoverRating || rating)
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-gray-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="comment" className="block text-sm font-medium mb-1">
                            Your Review
                        </label>
                        <Textarea
                            name="comment"
                            id="comment"
                            placeholder="Tell us what you think..."
                            required
                            minLength={10}
                            maxLength={500}
                        />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                </form>
            ) : (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <p className="text-gray-600">Please <a href="/auth/login" className="text-primary underline">log in</a> to leave a review.</p>
                </div>
            )}
        </div>
    );
}
