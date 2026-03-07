'use client';
import { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Star, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ReviewActions } from '@/app/admin/reviews/review-actions';

interface AdminReviewsTableProps {
    reviews: any[];
}

export function AdminReviewsTable({ reviews = [] }: AdminReviewsTableProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredReviews = useMemo(() => {
        return reviews.filter(review => {
            if (!searchQuery) return true;
            const term = searchQuery.toLowerCase();
            const productName = review.products?.name?.toLowerCase() || '';
            const customerName = review.profiles?.full_name?.toLowerCase() || '';
            const customerEmail = review.profiles?.email?.toLowerCase() || '';
            const comment = review.comment?.toLowerCase() || '';

            return productName.includes(term) ||
                customerName.includes(term) ||
                customerEmail.includes(term) ||
                comment.includes(term);
        });
    }, [reviews, searchQuery]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="Search reviews by product, customer, or comment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-stone-200"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-stone-50/50">
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredReviews.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-stone-500">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Search className="h-8 w-8 text-stone-300" />
                                        <p>No reviews found matching "{searchQuery}".</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReviews.map((review: any) => (
                                <TableRow key={review.id} className="hover:bg-stone-50/50">
                                    <TableCell className="font-medium text-deep-forest">
                                        {review.products?.name || 'Unknown Product'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-stone-700">{review.profiles?.full_name || 'Anonymous'}</span>
                                            <span className="text-xs text-stone-500">{review.profiles?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center font-bold text-stone-700">
                                            {review.rating} <Star className="h-3 w-3 ml-1 fill-amber-400 text-amber-400" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate text-stone-600" title={review.comment}>
                                        {review.comment}
                                    </TableCell>
                                    <TableCell className="text-stone-500 text-sm">
                                        {formatDate(review.created_at)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={review.is_approved ? 'default' : 'secondary'} className={
                                            review.is_approved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }>
                                            {review.is_approved ? 'Approved' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <ReviewActions reviewId={review.id} isApproved={review.is_approved} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
