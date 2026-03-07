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
import { Upload, X } from 'lucide-react';
import Image from 'next/image';

export default function NewBannerPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [position, setPosition] = useState('hero');
    const [active, setActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleDataSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!imageFile) throw new Error('Please select an image');

            const formData = new FormData();
            formData.append('title', title);
            formData.append('link', link);
            formData.append('position', position);
            formData.append('active', active.toString());
            formData.append('image', imageFile);

            const { createBannerAction } = await import('@/app/admin/marketing/banners/banner-actions');
            const result = await createBannerAction(formData);

            if (!result.success) {
                throw new Error(result.error);
            }

            toast.success('Banner created successfully');
            router.push('/admin/marketing/banners');
            router.refresh();

        } catch (error: any) {
            console.error('Error creating banner:', error);
            toast.error(error.message || 'Failed to create banner');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Add New Banner</h1>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Banner Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleDataSubmit} className="space-y-6">

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

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label>Banner Image</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleImageChange}
                                />
                                {imagePreview ? (
                                    <div className="relative w-full h-48">
                                        <Image src={imagePreview} alt="Preview" fill className="object-contain" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageFile(null);
                                                setImagePreview(null);
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500">Click or drag to upload image</p>
                                    </div>
                                )}
                            </div>
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
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Banner'}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
