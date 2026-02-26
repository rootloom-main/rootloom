import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { redirect } from 'next/navigation';
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
import { Star } from 'lucide-react';
import { ReviewActions } from './review-actions';

export default async function AdminReviewsPage() {
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: any | null };

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    // Attempt to fetch reviews
    const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
      *,
      profiles (full_name, email),
      products (name, slug)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return (
            <div className="container mx-auto px-6 py-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">Reviews</h1>
                <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-800">
                    <p className="font-semibold">Failed to load reviews.</p>
                    <p className="text-sm mt-1">{error.message}</p>
                    <p className="text-xs mt-2 text-red-600">Hint: Does the &apos;reviews&apos; table exist in your database?</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Product Reviews</h1>
                <p className="text-gray-500">Manage customer feedback.</p>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reviews?.map((review: any) => (
                            <TableRow key={review.id}>
                                <TableCell className="font-medium">
                                    {review.products?.name || 'Unknown Product'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{review.profiles?.full_name || 'Anonymous'}</span>
                                        <span className="text-xs text-muted-foreground">{review.profiles?.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        {review.rating} <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-xs truncate" title={review.comment}>
                                    {review.comment}
                                </TableCell>
                                <TableCell>{formatDate(review.created_at)}</TableCell>
                                <TableCell>
                                    <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                                        {review.is_approved ? 'Approved' : 'Pending'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!reviews || reviews.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No reviews found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
