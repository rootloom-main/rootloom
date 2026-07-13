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
import { Loader2, Image as ImageIcon, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { MediaLibrary } from '@/components/admin/media-library';

export default function EditBannerPage() {
    const router = useRouter();
    const params = useParams();
    const bannerId = params?.id as string;
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');
    const [collectionId, setCollectionId] = useState('none');
    const [collections, setCollections] = useState<any[]>([]);
    const [position, setPosition] = useState('hero');
    const [active, setActive] = useState(true);
    const [currentImageUrl, setCurrentImageUrl] = useState('');
    const [badge, setBadge] = useState('');
    const [cta, setCta] = useState('Discover Now');
    const [theme, setTheme] = useState('new-arrivals');
    const [displayOrder, setDisplayOrder] = useState('0');

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Collections
            const { data: cols } = await (supabase.from('collections' as any)).select('id, name').eq('is_active', true);
            if (cols) setCollections(cols);

            // 2. Fetch Banner
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .eq('id', bannerId)
                .single();

            const bannerData = data as any;
            if (error || !bannerData) {
                toast.error('Banner not found');
                router.push('/admin/marketing/banners');
                return;
            }

            setTitle(bannerData.title);
            setLink(bannerData.link || '');
            setCollectionId(bannerData.collection_id || 'none');
            setPosition(bannerData.position || 'hero');
            setActive(bannerData.active);
            setCurrentImageUrl(bannerData.image_url);
            setDisplayOrder(bannerData.display_order?.toString() || '0');
            
            if (bannerData.metadata) {
                setBadge(bannerData.metadata.badge || '');
                setCta(bannerData.metadata.cta || 'Discover Now');
                setTheme(bannerData.metadata.theme || 'new-arrivals');
            }
            
            setLoading(false);
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bannerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('link', link);
            formData.append('collection_id', collectionId);
            formData.append('position', position);
            formData.append('active', active.toString());
            formData.append('display_order', displayOrder);
            formData.append('badge', badge);
            formData.append('cta', cta);
            formData.append('theme', theme);
            if (currentImageUrl) {
                formData.append('existing_image_url', currentImageUrl);
            }

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
                        {/* Banner Image Asset */}
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold">Banner Image Asset</Label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <MediaLibrary 
                                    bucketName="banners"
                                    onSelect={(url) => setCurrentImageUrl(url)}
                                    currentUrl={currentImageUrl || ''}
                                    trigger={
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col gap-2"
                                        >
                                            <ImageIcon className="h-6 w-6 text-gray-400" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Choose from Library</span>
                                        </Button>
                                    }
                                />

                                <div className="relative h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setSaving(true);
                                                try {
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `${Math.random()}.${fileExt}`;
                                                    const { error: uploadError } = await supabase.storage
                                                        .from('banners')
                                                        .upload(fileName, file);
                                                    if (uploadError) throw uploadError;
                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from('banners')
                                                        .getPublicUrl(fileName);
                                                    setCurrentImageUrl(publicUrl);
                                                } catch (err: any) {
                                                    toast.error(err.message);
                                                } finally {
                                                    setSaving(false);
                                                }
                                            }
                                        }}
                                    />
                                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Upload Over</span>
                                </div>
                            </div>

                            {currentImageUrl && (
                                <div className="relative w-full h-64 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                                    <Image src={currentImageUrl} alt="Preview" fill className="object-cover" />
                                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-white">
                                        Active Asset
                                    </div>
                                </div>
                            )}
                        </div>

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

                        {/* Collection Selector */}
                        <div className="space-y-2">
                            <Label>Link to Collection (Dynamic)</Label>
                            <Select value={collectionId} onValueChange={setCollectionId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a collection" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (Use Manual Link)</SelectItem>
                                    {collections.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-gray-400">If selected, this overrides the manual Target Link.</p>
                        </div>

                        {/* Link */}
                        <div className="space-y-2">
                            <Label htmlFor="link">Manual Target Link (Optional)</Label>
                            <Input
                                id="link"
                                placeholder="/collections/summer"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                disabled={collectionId !== 'none'}
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

                        {/* Display Order */}
                        <div className="space-y-2">
                            <Label htmlFor="displayOrder">Display Order (Higher appears first)</Label>
                            <Input
                                id="displayOrder"
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(e.target.value)}
                            />
                        </div>

                        {/* Hero Specific Fields */}
                        {position === 'hero' && (
                            <div className="space-y-6 p-4 bg-gray-50 rounded-lg border">
                                <h3 className="font-semibold text-sm text-gray-700">Hero Section Details</h3>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="badge">Badge Text</Label>
                                    <Input
                                        id="badge"
                                        placeholder="NEW COLLECTION"
                                        value={badge}
                                        onChange={(e) => setBadge(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="cta">Button Text</Label>
                                    <Input
                                        id="cta"
                                        placeholder="Discover Now"
                                        value={cta}
                                        onChange={(e) => setCta(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="theme">Theme / Style</Label>
                                    <Select value={theme} onValueChange={setTheme}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select theme" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new-arrivals">Forest Edition (Dark Green)</SelectItem>
                                            <SelectItem value="earth">Earth & Fiber (Sand/Linen)</SelectItem>
                                            <SelectItem value="artisan">Artisan (Raw Clay)</SelectItem>
                                            <SelectItem value="indigo">Indigo Tales (Deep Blue)</SelectItem>
                                            <SelectItem value="sustainable">Sustainable (Stone Paper)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

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
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
