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
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { MediaLibrary } from '@/components/admin/media-library';

export default function NewBannerPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [collectionId, setCollectionId] = useState('none');
    const [collections, setCollections] = useState<any[]>([]);
    const [position, setPosition] = useState('hero');
    const [active, setActive] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [badge, setBadge] = useState('');
    const [cta, setCta] = useState('Discover Now');
    const [theme, setTheme] = useState('streetwear');
    const [displayOrder, setDisplayOrder] = useState('0');

    useEffect(() => {
        const fetchCollections = async () => {
            const { data } = await (supabase.from('collections' as any)).select('id, name').eq('is_active', true);
            if (data) setCollections(data);
        };
        fetchCollections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            if (!imageFile && !imagePreview) throw new Error('Please select an image');

            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('link', link);
            formData.append('position', position);
            formData.append('active', active.toString());
            formData.append('display_order', displayOrder);
            formData.append('badge', badge);
            formData.append('cta', cta);
            formData.append('theme', theme);
            formData.append('collection_id', collectionId);
            if (imageFile) {
                formData.append('image', imageFile);
            }
            if (imagePreview && !imageFile) {
                formData.append('existing_image_url', imagePreview);
            }

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

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Up to 50% off on all organic cotton wear"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-4">
                            <Label className="text-sm font-semibold">Banner Image</Label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <MediaLibrary 
                                    bucketName="banners"
                                    onSelect={(url) => {
                                        setImagePreview(url);
                                        setImageFile(null); // Clear file if library URL selected
                                    }}
                                    currentUrl={imagePreview || ''}
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
                                        onChange={handleImageChange}
                                    />
                                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Upload New</span>
                                </div>
                            </div>

                            {imagePreview && (
                                <div className="relative w-full h-64 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-4 right-4 z-10 rounded-full shadow-lg"
                                        onClick={() => {
                                            setImageFile(null);
                                            setImagePreview(null);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-white">
                                        {imageFile ? 'Local File' : 'Library Asset'}
                                    </div>
                                </div>
                            )}
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
                                            <SelectItem value="streetwear">Streetwear Drip (Black / Neon Pink)</SelectItem>
                                            <SelectItem value="electric">Electric Cyber (Bold Blue / Cyber Yellow)</SelectItem>
                                            <SelectItem value="cyber">Cyberpunk Matrix (Dark / Neon Cyan)</SelectItem>
                                            <SelectItem value="neon">Neon Voltage (Deep Purple / Neon Green)</SelectItem>
                                            <SelectItem value="minimal-urban">Minimal Urban (Clean White / Pure Black)</SelectItem>
                                            <SelectItem value="sunset">Sunset Drip (Sunset Gradient / Black)</SelectItem>
                                            <SelectItem value="graffiti">Graffiti Grunge (Charcoal / Acid Green)</SelectItem>
                                            <SelectItem value="new-arrivals">Forest Edition (Deep Forest Green / Ivory)</SelectItem>
                                            <SelectItem value="earth">Earth & Fiber (Sand & Linen / Forest)</SelectItem>
                                            <SelectItem value="artisan">Artisan Legacy (Warm Clay / Ivory)</SelectItem>
                                            <SelectItem value="indigo">Indigo Tales (Deep Indigo / Indigo Blue)</SelectItem>
                                            <SelectItem value="sustainable">Sustainable (Eco Pine / Mint)</SelectItem>
                                            <SelectItem value="default">Classic Dark (Pure Black / Crisp White)</SelectItem>
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
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? 'Creating...' : 'Create Banner'}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
