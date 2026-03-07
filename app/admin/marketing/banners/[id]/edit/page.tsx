'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import Image from 'next/image';

export default function EditBannerPage() {
    const router = useRouter();
    const params = useParams();
    const bannerId = params?.id as string;
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [position, setPosition] = useState('hero');
    const [active, setActive] = useState(true);
    const [currentImageUrl, setCurrentImageUrl] = useState('');

    useEffect(() => {
        const fetchBanner = async () => {
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .eq('id', bannerId)
                .single();

            if (error || !data) {
                toast.error('Banner not found');
                router.push('/admin/marketing/banners');
                return;
            }

            setTitle(data.title);
            setLink(data.link || '');
            setPosition(data.position || 'hero');
            setActive(data.active);
            setCurrentImageUrl(data.image_url);
            setLoading(false);
        };

        fetchBanner();
    }, [bannerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('link', link);
            formData.append('position', position);
            formData.append('active', active.toString());

            const { updateBannerAction } = await import('@/app/admin/marketing/banners/banner-actions');
            const result = await updateBannerAction(bannerId, formData);

            if (!result.success) {
                throw new Error(result.error);
            }

            toast.success('Banner updated successfully');
            router.push('/admin/marketing/banners');
            router.refresh();
        } catch (error: any) {
            console.error('Error updating banner:', error);
            toast.error(error.message || 'Failed to update banner');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Edit Banner</h1>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Banner Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Current Image Preview */}
                        {currentImageUrl && (
                            <div className="space-y-2">
                                <Label>Current Image</Label>
                                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                    <Image src={currentImageUrl} alt={title} fill className="object-cover" />
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="Summer Sale"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        {/* Link */}
                        <div className="space-y-2">
                            <Label htmlFor="link">Target Link (Optional)</Label>
                            <Input
                                id="link"
                                placeholder="/collections/summer"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                            />
                        </div>

                        {/* Position */}
                        <div className="space-y-2">
                            <Label htmlFor="position">Position</Label>
                            <Select value={position} onValueChange={setPosition}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hero">Hero Slider</SelectItem>
                                    <SelectItem value="promo_top">Top Promo</SelectItem>
                                    <SelectItem value="promo_bottom">Bottom Promo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="active"
                                checked={active}
                                onCheckedChange={setActive}
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
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
