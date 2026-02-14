'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function NewCouponPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    // Form State
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState('flat');
    const [value, setValue] = useState('');
    const [minOrderValue, setMinOrderValue] = useState('');
    const [usageLimit, setUsageLimit] = useState('');
    const [isActive, setIsActive] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('coupons')
                .insert({
                    code: code.toUpperCase(),
                    discount_type: discountType,
                    value: parseFloat(value),
                    min_order_value: minOrderValue ? parseFloat(minOrderValue) : 0,
                    usage_limit: usageLimit ? parseInt(usageLimit) : null,
                    is_active: isActive
                });

            if (error) throw error;

            toast.success('Coupon created successfully');
            router.push('/admin/marketing/coupons');
            router.refresh();

        } catch (error: any) {
            console.error('Error creating coupon:', error);
            toast.error(error.message || 'Failed to create coupon');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Create Coupon</h1>

            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>Coupon Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="space-y-2">
                            <Label htmlFor="code">Coupon Code</Label>
                            <Input
                                id="code"
                                placeholder="SUMMER25"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="uppercase font-mono"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Discount Type</Label>
                                <Select value={discountType} onValueChange={setDiscountType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="value">Value</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    placeholder={discountType === 'percentage' ? "10" : "500"}
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="min_order">Min Order Value</Label>
                                <Input
                                    id="min_order"
                                    type="number"
                                    placeholder="0"
                                    value={minOrderValue}
                                    onChange={(e) => setMinOrderValue(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="limit">Usage Limit (Total)</Label>
                                <Input
                                    id="limit"
                                    type="number"
                                    placeholder="Optional"
                                    value={usageLimit}
                                    onChange={(e) => setUsageLimit(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="active"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                            <Label htmlFor="active">Active</Label>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Coupon'}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
