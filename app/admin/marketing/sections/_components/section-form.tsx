'use client';

import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

const SECTION_TYPES = [
    { value: 'HERO', label: 'Hero Slider' },
    { value: 'COLLECTION_GRID', label: 'Product Grid (Dynamic)' },
    { value: 'PROMO', label: 'Static Promo Banner (Top)' },
    { value: 'PROMO_BOTTOM', label: 'Static Promo Banner (Bottom)' },
    { value: 'CATEGORY_GRID', label: 'Category Grid' },
    { value: 'NEW_ARRIVALS', label: 'Standard New Arrivals' },
    { value: 'BEST_SELLERS', label: 'Standard Best Sellers' },
    { value: 'FEATURED', label: 'Standard Featured' },
    { value: 'BRAND_STORY', label: 'Brand Story' },
    { value: 'NEWSLETTER', label: 'Newsletter Signup' },
    { value: 'TRUST', label: 'Trust Indicators' },
];

export function SectionForm({ initialData }: { initialData?: any }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);

    const [type, setType] = useState(initialData?.type || 'COLLECTION_GRID');
    const [title, setTitle] = useState(initialData?.title || '');
    const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
    const [active, setActive] = useState(initialData?.active ?? true);
    const [collection, setCollection] = useState(initialData?.config?.collection || '');
    const [limit, setLimit] = useState(initialData?.config?.limit || '8');
    const [displayOrder, setDisplayOrder] = useState(initialData?.display_order || 0);

    useEffect(() => {
        const fetchCollections = async () => {
            const { data } = await (supabase.from('collections') as any).select('id, name, slug').eq('is_active', true);
            if (data) setCollections(data);
        };
        fetchCollections();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const sectionData = {
            type,
            title,
            subtitle,
            active,
            display_order: parseInt(displayOrder.toString()),
            config: {
                collection: collection || null,
                limit: parseInt(limit.toString()) || 8
            }
        };

        try {
            if (initialData?.id) {
                const { error } = await supabase
                    .from('home_sections')
                    .update(sectionData)
                    .eq('id', initialData.id);
                if (error) throw error;
                toast.success('Section updated');
            } else {
                const { error } = await supabase
                    .from('home_sections')
                    .insert([sectionData]);
                if (error) throw error;
                toast.success('Section created');
            }
            router.push('/admin/marketing/sections');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Section Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Component Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {SECTION_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Public Title (Visible on Home)</Label>
                        <Input 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="e.g. SUMMER SALE"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Subtitle / Accent Text</Label>
                        <Input 
                            value={subtitle} 
                            onChange={e => setSubtitle(e.target.value)} 
                            placeholder="e.g. Get 50% Off"
                        />
                    </div>

                    {type === 'COLLECTION_GRID' && (
                        <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
                            <h4 className="text-sm font-bold text-slate-700">Grid Settings</h4>
                            <div className="space-y-2">
                                <Label>Target Collection</Label>
                                <Select value={collection} onValueChange={setCollection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a collection" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {collections.map(c => (
                                            <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-gray-400">Products from this collection will be displayed in a grid.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Product Limit</Label>
                                <Input 
                                    type="number" 
                                    value={limit} 
                                    onChange={e => setLimit(e.target.value)} 
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Display Order</Label>
                        <Input 
                            type="number" 
                            value={displayOrder} 
                            onChange={e => setDisplayOrder(e.target.value)} 
                        />
                        <p className="text-[10px] text-gray-400">Lower numbers appear first.</p>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch id="active" checked={active} onCheckedChange={setActive} />
                        <Label htmlFor="active">Active (Visible to Customers)</Label>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData?.id ? 'Save Changes' : 'Create Section'}
                </Button>
            </div>
        </form>
    );
}
