import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';

export default async function CouponsPage() {
    const supabase = await createClient();

    const { data: coupons } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Coupons</h1>
                <Link href="/admin/marketing/coupons/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create Coupon
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Coupons</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons?.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                                    <TableCell className="capitalize">{coupon.discount_type}</TableCell>
                                    <TableCell>
                                        {coupon.discount_type === 'flat' ? formatPrice(coupon.value) : `${coupon.value}%`}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.usage_count} / {coupon.usage_limit || '∞'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {coupon.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {coupons?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No coupons found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
