'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
    Loader2, 
    Search, 
    X, 
    Layers, 
    Plus, 
    Trash2, 
    GripVertical,
    Copy,
    ExternalLink,
    Zap,
    Settings2,
    Globe,
    Tag,
    ArrowRight,
    Upload
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MediaLibrary } from "@/components/admin/media-library";

interface CollectionFormProps {
    initialData?: any;
    productsInCollection?: any[];
}

export function CollectionForm({ initialData, productsInCollection = [] }: CollectionFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    
    // Basic Fields
    const [name, setName] = useState(initialData?.name || '');
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
    const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
    const [startDate, setStartDate] = useState(initialData?.start_date?.split('T')[0] || '');
    const [endDate, setEndDate] = useState(initialData?.end_date?.split('T')[0] || '');
    const [startTime, setStartTime] = useState(initialData?.start_date?.split('T')[1]?.substring(0, 5) || '00:00');
    const [endTime, setEndTime] = useState(initialData?.end_date?.split('T')[1]?.substring(0, 5) || '23:59');

    // Enterprise CMS Fields
    const [type, setType] = useState<'manual' | 'automated'>(initialData?.type || 'manual');
    const [rules, setRules] = useState<any[]>(initialData?.rules || []);
    const [seoMetadata, setSeoMetadata] = useState({
        title: initialData?.seo_metadata?.title || '',
        description: initialData?.seo_metadata?.description || '',
    });
    const [marketingSettings, setMarketingSettings] = useState({
        showOnHomepage: initialData?.marketing_settings?.showOnHomepage || false,
        featureInHero: initialData?.marketing_settings?.featureInHero || false,
        includeInNav: initialData?.marketing_settings?.includeInNav || false,
    });
    const [badgeLabel, setBadgeLabel] = useState(initialData?.badge_label || '');
    const [sortBy, setSortBy] = useState(initialData?.sort_by || 'newest');

    // Reference Data
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await (supabase.from('categories') as any).select('*');
            if (data) setCategories(data);
        };
        fetchCategories();
    }, []);

    // Product Assignment
    const [selectedProducts, setSelectedProducts] = useState<any[]>(productsInCollection);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    // Auto-slugify
    useEffect(() => {
        if (!initialData?.id && name) {
            const generated = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            setSlug(generated);
        }
    }, [name, initialData?.id]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Link copied to clipboard');
    };

    const addRule = () => {
        setRules([...rules, { field: 'category', operator: 'equals', value: '' }]);
    };

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        setRules(newRules);
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const publicUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/collections/${slug}` 
        : `https://rootloom.in/collections/${slug}`;

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        const { data, error } = await supabase
            .from('products')
            .select('id, name, slug, base_price, product_images(image_url)')
            .ilike('name', `%${query}%`)
            .limit(10);

        if (!error && data) {
            setSearchResults(data);
        }
        setSearching(false);
    };

    const addProduct = (product: any) => {
        if (selectedProducts.find(p => p.id === product.id)) {
            toast.error('Product already in collection');
            return;
        }
        setSelectedProducts([...selectedProducts, product]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeProduct = (id: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !slug) {
            toast.error('Name and Slug are required');
            return;
        }

        setLoading(true);
        const collectionData = {
            name,
            slug,
            description,
            image_url: imageUrl,
            is_active: isActive,
            start_date: startDate ? new Date(`${startDate}T${startTime}:00`).toISOString() : null,
            end_date: endDate ? new Date(`${endDate}T${endTime}:00`).toISOString() : null,
            type,
            rules,
            seo_metadata: seoMetadata,
            marketing_settings: marketingSettings,
            badge_label: badgeLabel,
            sort_by: sortBy,
            updated_at: new Date().toISOString()
        };

        const { saveCollectionAction } = await import('../collection-actions');
        const res = await saveCollectionAction(initialData?.id, collectionData, selectedProducts);

        if (res.success) {
            toast.success(`Collection ${initialData?.id ? 'updated' : 'created'} successfully`);
            router.push('/admin/marketing/collections');
            router.refresh();
        } else {
            toast.error(res.error || 'Failed to save collection');
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            {/* Enterprise Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border rounded-2xl shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">
                            {initialData?.id ? 'Edit Collection' : 'Create Collection'}
                        </h2>
                        <Badge variant={type === 'automated' ? 'default' : 'secondary'} className="rounded-full uppercase text-[10px] font-black tracking-widest">
                            {type}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <Globe className="h-3 w-3" />
                        <span className="truncate max-w-[200px] sm:max-w-md">{publicUrl}</span>
                        <div className="flex gap-1">
                            <button type="button" onClick={() => copyToClipboard(publicUrl)} className="p-1 hover:bg-slate-100 rounded transition-colors text-blue-600">
                                <Copy className="h-3 w-3" />
                            </button>
                            <Link href={`/collections/${slug}`} target="_blank" className="p-1 hover:bg-slate-100 rounded transition-colors text-blue-600">
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" type="button" onClick={() => router.back()} className="h-10 px-6 font-bold uppercase tracking-wider text-xs border-2">
                        Cancel
                    </Button>
                    <Button type="submit" size="lg" disabled={loading} className="h-10 px-8 font-black uppercase tracking-widest text-xs bg-black hover:bg-zinc-800 text-white shadow-lg shadow-black/10">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 fill-current" />}
                        {initialData?.id ? 'Save Changes' : 'Launch Drop'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-6">
                        <Card className="border-2 border-slate-100 shadow-none overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b">
                                <CardTitle className="text-sm font-black uppercase tracking-tight">Identity & Story</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Collection Name</Label>
                                    <Input 
                                        id="name" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)} 
                                        placeholder="e.g. Summer Essentials 2026"
                                        className="h-12 text-sm font-bold bg-slate-50 border-slate-100 focus:bg-white transition-all rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="slug" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Public Entry Slug</Label>
                                    <div className="flex items-center gap-0 border-2 border-slate-100 rounded-xl bg-slate-100 overflow-hidden">
                                        <div className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-200">
                                            /collections/
                                        </div>
                                        <Input 
                                            id="slug" 
                                            value={slug} 
                                            onChange={e => setSlug(e.target.value)} 
                                            placeholder="summer-essentials"
                                            className="h-12 border-0 bg-white font-mono text-xs font-bold text-indigo-600 focus-visible:ring-0 rounded-none shadow-none"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brand Copy (Description)</Label>
                                    <Textarea 
                                        id="description" 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)} 
                                        placeholder="Tell the story of this collection..."
                                        rows={4}
                                        className="bg-slate-50 border-slate-100 focus:bg-white transition-all rounded-xl text-sm font-medium leading-relaxed"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="products" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/50 p-1 h-12">
                            <TabsTrigger value="products" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Layers className="h-3 w-3 mr-2 text-indigo-500" />
                                Products
                            </TabsTrigger>
                            <TabsTrigger value="marketing" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Settings2 className="h-3 w-3 mr-2 text-amber-500" />
                                Marketing
                            </TabsTrigger>
                            <TabsTrigger value="seo" className="font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Globe className="h-3 w-3 mr-2 text-teal-500" />
                                SEO
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="products" className="space-y-6">
                            <Card className="border-2 border-slate-100 shadow-none overflow-hidden">
                                <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between border-b">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">Collection Strategy</CardTitle>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">How are products selected for this list?</p>
                                    </div>
                                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                                        <SelectTrigger className="w-40 bg-white h-9 text-xs font-bold uppercase tracking-wider border-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual" className="text-xs font-bold uppercase tracking-wider">Manual</SelectItem>
                                            <SelectItem value="automated" className="text-xs font-bold uppercase tracking-wider">Automated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {type === 'automated' ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-bold text-slate-800">Curation Rules</h3>
                                                    <p className="text-xs text-slate-500">Products matching ANY of these rules will be included.</p>
                                                </div>
                                                <Button type="button" onClick={addRule} size="sm" variant="outline" className="h-8 px-3 font-bold text-[10px] uppercase border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50">
                                                    <Plus className="h-3 w-3 mr-1" /> Add Rule
                                                </Button>
                                            </div>

                                            {rules.length === 0 ? (
                                                <div className="text-center py-10 bg-indigo-50/30 rounded-2xl border-2 border-dashed border-indigo-100/50">
                                                    <Zap className="h-8 w-8 text-indigo-200 mx-auto mb-2" />
                                                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">No automation rules defined</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {rules.map((rule, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 p-3 bg-white border-2 rounded-xl group transition-all hover:border-indigo-200">
                                                            <div className="grid grid-cols-3 gap-3 flex-1">
                                                                <Select value={rule.field} onValueChange={v => updateRule(idx, 'field', v)}>
                                                                    <SelectTrigger className="h-9 text-xs font-medium">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="category">Category</SelectItem>
                                                                        <SelectItem value="price">Price</SelectItem>
                                                                        <SelectItem value="tag">Tag</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                
                                                                <Select value={rule.operator} onValueChange={v => updateRule(idx, 'operator', v)}>
                                                                    <SelectTrigger className="h-9 text-xs font-medium">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="equals">Equals</SelectItem>
                                                                        <SelectItem value="greater_than">Is Greater Than</SelectItem>
                                                                        <SelectItem value="less_than">Is Less Than</SelectItem>
                                                                        <SelectItem value="contains">Contains</SelectItem>
                                                                    </SelectContent>
                                                                </Select>

                                                                {rule.field === 'category' ? (
                                                                    <Select value={rule.value} onValueChange={v => updateRule(idx, 'value', v)}>
                                                                        <SelectTrigger className="h-9 text-xs font-medium text-blue-600 font-bold">
                                                                            <SelectValue placeholder="Select Category" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {categories.map(c => (
                                                                                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <Input 
                                                                        value={rule.value} 
                                                                        onChange={e => updateRule(idx, 'value', e.target.value)}
                                                                        placeholder="Value..."
                                                                        className="h-9 text-xs font-medium"
                                                                    />
                                                                )}
                                                            </div>
                                                            <Button type="button" onClick={() => removeRule(idx)} variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="pt-4 border-t">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Default Sorting</Label>
                                                <Select value={sortBy} onValueChange={setSortBy}>
                                                    <SelectTrigger className="h-10 text-xs font-bold w-full uppercase tracking-wider bg-slate-50 border-2 border-slate-100">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="newest" className="text-xs uppercase font-bold tracking-wider">Newest Arrivals</SelectItem>
                                                        <SelectItem value="oldest" className="text-xs uppercase font-bold tracking-wider">Oldest First</SelectItem>
                                                        <SelectItem value="price-low" className="text-xs uppercase font-bold tracking-wider">Price: Low to High</SelectItem>
                                                        <SelectItem value="price-high" className="text-xs uppercase font-bold tracking-wider">Price: High to Low</SelectItem>
                                                        <SelectItem value="trending" className="text-xs uppercase font-bold tracking-wider">Trending / Sales</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Search Box */}
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input 
                                                    placeholder="Search products to add..."
                                                    className="pl-10 h-11 bg-white border-2 rounded-xl border-slate-100 focus:border-indigo-400 transition-all font-medium text-sm"
                                                    value={searchQuery}
                                                    onChange={e => handleSearch(e.target.value)}
                                                />
                                                
                                                {searchResults.length > 0 && (
                                                    <div className="absolute z-20 w-full mt-2 bg-white border-2 rounded-xl shadow-2xl overflow-hidden border-slate-100 animate-in fade-in zoom-in duration-200">
                                                        {searchResults.map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50/50 transition-colors text-left border-b last:border-0"
                                                                onClick={() => addProduct(p)}
                                                            >
                                                                <div className="relative h-10 w-10 rounded-lg border-2 border-slate-100 overflow-hidden shrink-0">
                                                                    <Image 
                                                                        src={p.product_images?.[0]?.image_url || 'https://via.placeholder.com/150'} 
                                                                        alt={p.name} 
                                                                        fill 
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate">{p.name}</p>
                                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">₹{p.base_price}</p>
                                                                </div>
                                                                <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center">
                                                                    <Plus className="h-3 w-3 text-indigo-600" />
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Selection List */}
                                            <div className="space-y-3">
                                                {selectedProducts.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-3xl border-slate-100 bg-slate-50/30">
                                                        <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                                            <Layers className="h-8 w-8 text-slate-200" />
                                                        </div>
                                                        <p className="text-xs font-black uppercase text-slate-300 tracking-widest">Zero items selected</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-2">
                                                        {selectedProducts.map((p, index) => (
                                                            <div 
                                                                key={p.id} 
                                                                className="flex items-center gap-4 p-3 bg-white border-2 border-slate-50 rounded-2xl group transition-all hover:border-slate-200"
                                                            >
                                                                <GripVertical className="h-4 w-4 text-slate-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                <div className="relative h-12 w-12 rounded-xl border-2 border-slate-50 bg-white overflow-hidden shrink-0">
                                                                    <Image 
                                                                        src={p.product_images?.[0]?.image_url || 'https://via.placeholder.com/150'} 
                                                                        alt={p.name} 
                                                                        fill 
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight truncate">{p.name}</p>
                                                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">₹{p.base_price}</p>
                                                                </div>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                                    onClick={() => removeProduct(p.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="marketing" className="space-y-6">
                            <Card className="border-2 border-slate-100 shadow-none">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                            <Tag className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">Marketing Configuration</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-black uppercase tracking-widest text-slate-800">Homepage Grid</Label>
                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Display in "Our Collections" section.</p>
                                            </div>
                                            <Switch 
                                                checked={marketingSettings.showOnHomepage} 
                                                onCheckedChange={v => setMarketingSettings({...marketingSettings, showOnHomepage: v})} 
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-black uppercase tracking-widest text-slate-800">Hero Slider</Label>
                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Available feature for top banners.</p>
                                            </div>
                                            <Switch 
                                                checked={marketingSettings.featureInHero} 
                                                onCheckedChange={v => setMarketingSettings({...marketingSettings, featureInHero: v})} 
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Badge Label</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {['SALE', 'NEW', 'LIMITED', 'HYPE', 'VINTAGE', 'TRENDING'].map(label => (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        onClick={() => setBadgeLabel(badgeLabel === label ? '' : label)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border-2",
                                                            badgeLabel === label 
                                                                ? "bg-black text-white border-black scale-105 shadow-md shadow-black/20" 
                                                                : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="pt-2">
                                                <Input 
                                                    value={badgeLabel} 
                                                    onChange={e => setBadgeLabel(e.target.value.toUpperCase())}
                                                    placeholder="OR TYPE CUSTOM BADGE..."
                                                    className="h-9 text-[10px] font-black uppercase tracking-widest bg-slate-100/50 border-0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="seo" className="space-y-6">
                            <Card className="border-2 border-slate-100 shadow-none overflow-hidden">
                                <CardHeader className="bg-teal-500/5 border-b">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                            <Globe className="h-4 w-4 text-teal-600" />
                                        </div>
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">Search Optimizer (SEO)</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="p-4 bg-slate-900 rounded-2xl space-y-2 shadow-inner">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-2 w-2 rounded-full bg-red-400" />
                                            <div className="h-2 w-2 rounded-full bg-amber-400" />
                                            <div className="h-2 w-2 rounded-full bg-green-400" />
                                        </div>
                                        <p className="text-xs font-bold text-teal-400 font-mono truncate">rootloom.in › collections › {slug}</p>
                                        <h4 className="text-base font-bold text-blue-400 line-clamp-1">{seoMetadata.title || name || 'Page Title'}</h4>
                                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                                            {seoMetadata.description || description || 'No meta description provided. Google will auto-generate one based on content.'}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-slate-800">SEO Title Override</Label>
                                            <Input 
                                                value={seoMetadata.title} 
                                                onChange={e => setSeoMetadata({...seoMetadata, title: e.target.value})}
                                                placeholder="Leave empty to use Collection Name"
                                                className="bg-slate-50 border-slate-100 h-11 text-xs font-medium"
                                            />
                                            <p className="text-[9px] text-slate-400 uppercase font-black">Optimal: 50-60 characters</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-slate-800">Meta Description</Label>
                                            <Textarea 
                                                value={seoMetadata.description} 
                                                onChange={e => setSeoMetadata({...seoMetadata, description: e.target.value})}
                                                placeholder="Write a high-converting description for search engines..."
                                                className="bg-slate-50 border-slate-100 text-xs font-medium resize-none"
                                                rows={4}
                                            />
                                            <p className="text-[9px] text-slate-400 uppercase font-black">Optimal: 150-160 characters</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card className="border-2 border-slate-100 shadow-none overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-tight">Status & Timing</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl shadow-lg border-b-4 border-slate-800">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-black uppercase tracking-widest text-white">Live Status</Label>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Public visibility toggle.</p>
                                </div>
                                <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-green-500" />
                            </div>

                            <div className="grid gap-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        Launch Schedule
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Input 
                                            type="date" 
                                            value={startDate} 
                                            onChange={e => setStartDate(e.target.value)} 
                                            className="h-10 text-xs font-bold bg-slate-50 border-slate-100"
                                        />
                                        <Input 
                                            type="time" 
                                            value={startTime} 
                                            onChange={e => setStartTime(e.target.value)} 
                                            className="h-10 text-xs font-bold bg-slate-50 border-slate-100"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        Expiry Window
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Input 
                                            type="date" 
                                            value={endDate} 
                                            onChange={e => setEndDate(e.target.value)} 
                                            className="h-10 text-xs font-bold bg-slate-50 border-slate-100"
                                        />
                                        <Input 
                                            type="time" 
                                            value={endTime} 
                                            onChange={e => setEndTime(e.target.value)} 
                                            className="h-10 text-xs font-bold bg-slate-50 border-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-slate-100 shadow-none overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-tight">Visual Identity</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="relative aspect-video bg-slate-100 rounded-3xl border-4 border-white shadow-inner overflow-hidden flex items-center justify-center group">
                                {imageUrl ? (
                                    <Image src={imageUrl} alt="Banner" fill className="object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="text-center space-y-2">
                                        <Layers className="h-10 w-10 text-slate-200 mx-auto" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No Key Asset</p>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Primary Banner Asset</Label>
                                <MediaLibrary 
                                    bucketName="collections"
                                    currentUrl={imageUrl}
                                    onSelect={(url) => setImageUrl(url)}
                                    trigger={
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50 transition-all group"
                                        >
                                            <Upload className="h-4 w-4 mr-2 text-slate-400 group-hover:text-indigo-500" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Select or Upload Image</span>
                                        </Button>
                                    }
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="imageUrl" className="text-[10px] font-bold text-slate-400 uppercase">Direct Master URL</Label>
                                    <Input 
                                        id="imageUrl" 
                                        value={imageUrl} 
                                        onChange={e => setImageUrl(e.target.value)} 
                                        placeholder="https://..."
                                        className="h-9 text-[10px] font-medium bg-slate-50 border-0"
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-300 uppercase leading-tight">Recommended: 1920x1080px for high-impact displays.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </form>
    );
}
