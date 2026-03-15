'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { createProduct, updateProduct } from '@/lib/actions/product';
import { Loader2, Plus, Trash, X } from 'lucide-react';
import Image from 'next/image';

const productSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
    description: z.string().optional(),
    category_id: z.string().min(1, 'Category is required'),
    base_price: z.coerce.number().min(0, 'Price must be positive'),
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'active', 'archived']).default('draft'),
    metadata: z.object({
        fabric: z.string().optional(),
        material: z.string().optional(),
        genz_tagline: z.string().optional(),
        shipping_info: z.string().optional(),
        size_guide_html: z.string().optional(),
        perks: z.array(z.object({
            label: z.string().min(1),
            desc: z.string().min(1)
        })).optional(),
    }).optional(),
    variants: z
        .array(
            z.object({
                size: z.string().min(1, 'Size is required'),
                color: z.string().min(1, 'Color is required'),
                stock: z.coerce.number().min(0, 'Stock must be positive'),
                sku: z.string().optional(),
            })
        )
        .min(1, 'At least one variant is required'),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface Category {
    id: string;
    name: string;
}

interface ProductFormProps {
    initialData?: any;
    categories: Category[];
    collections: any[];
}

export function ProductForm({ initialData, categories, collections }: ProductFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<any[]>(
        initialData?.product_images || []
    );
    const [selectedCollections, setSelectedCollections] = useState<string[]>(
        initialData?.collection_products?.map((cp: any) => cp.collection_id) || []
    );

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: initialData
            ? {
                name: initialData.name,
                slug: initialData.slug,
                description: initialData.description,
                category_id: initialData.category_id,
                base_price: initialData.base_price,
                featured: initialData.featured,
                status: initialData.status || 'draft',
                metadata: {
                    fabric: initialData.metadata?.fabric || '',
                    material: initialData.metadata?.material || '',
                    genz_tagline: initialData.metadata?.genz_tagline || '',
                    shipping_info: initialData.metadata?.shipping_info || '',
                    size_guide_html: initialData.metadata?.size_guide_html || '',
                    perks: initialData.metadata?.perks || [
                        { label: 'Premium Packaging', desc: 'Arrives in eco-friendly packaging' },
                        { label: 'Quality Assured', desc: 'Every piece hand-inspected' },
                        { label: 'Sustainable', desc: 'Eco-conscious production' },
                        { label: 'Verified Brand', desc: 'Authentic Root & Loom product' },
                    ],
                },
                variants: initialData.product_variants || [
                    { size: '', color: '', stock: 0, sku: '' },
                ],
            }
            : {
                name: '',
                slug: '',
                description: '',
                category_id: '',
                base_price: 0,
                featured: false,
                status: 'draft',
                metadata: {
                    fabric: '',
                    material: '',
                    genz_tagline: '',
                    shipping_info: '',
                    size_guide_html: '',
                    perks: [
                        { label: 'Premium Packaging', desc: 'Arrives in eco-friendly packaging' },
                        { label: 'Quality Assured', desc: 'Every piece hand-inspected' },
                        { label: 'Sustainable', desc: 'Eco-conscious production' },
                        { label: 'Verified Brand', desc: 'Authentic Root & Loom product' },
                    ],
                },
                variants: [{ size: '', color: '', stock: 0, sku: '' }],
            },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'variants',
    });

    const onSubmit = async (data: ProductFormValues) => {
        setLoading(true);
        try {
            let productId = initialData?.id;
            const selectedCategory = categories.find(c => c.id === data.category_id);
            const submissionData = {
                ...data,
                category_slug: selectedCategory?.name // Use name as slug/context for now
            };

            if (initialData) {
                // Update
                const result = await updateProduct(productId, submissionData);
                if (!result.success) throw new Error(result.message);
                // Variants are handled in server action
            } else {
                // Create
                const result = await createProduct(submissionData);
                if (!result.success) throw new Error(result.message);
                productId = result.productId;
            }

            // 3. Handle Cloudinary/Supabase Image Uploads
            // (Images still need client-side upload because we need the file objects)
            if (images.length > 0) {
                for (const image of images) {
                    const fileExt = image.name.split('.').pop();
                    const fileName = `${productId}/${Math.random()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('products')
                        .upload(fileName, image);

                    if (uploadError) throw uploadError;

                    const {
                        data: { publicUrl },
                    } = supabase.storage.from('products').getPublicUrl(fileName);

                    await supabase.from('product_images').insert({
                        product_id: productId,
                        image_url: publicUrl,
                        alt_text: data.name,
                    });
                }
            }

            // 4. Handle Collection Assignments
            if (productId) {
                // Delete existing mappings
                await (supabase as any).from('collection_products').delete().eq('product_id', productId);
                
                // Insert new mappings
                if (selectedCollections.length > 0) {
                    const mappings = selectedCollections.map(colId => ({
                        product_id: productId,
                        collection_id: colId
                    }));
                    await (supabase as any).from('collection_products').insert(mappings);
                }
            }

            toast.success(initialData ? 'Product updated' : 'Product created');
            router.push('/admin/products');
            router.refresh();
        } catch (error: any) {
            console.error('Error submitting form:', error);
            toast.error(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setImages(prev => [...prev, ...newFiles]);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setImagePreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeNewImage = (index: number) => {
        // Revoke the URL to avoid memory leaks
        URL.revokeObjectURL(imagePreviews[index]);

        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleImageDelete = async (imageId: string) => {
        // Optimistic update
        setExistingImages(existingImages.filter((img) => img.id !== imageId));
        await supabase.from('product_images').delete().eq('id', imageId);
        toast.success('Image deleted');
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Product Name"
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                // Auto-generate slug from name if creating
                                                if (!initialData) {
                                                    form.setValue(
                                                        'slug',
                                                        e.target.value
                                                            .toLowerCase()
                                                            .replace(/ /g, '-')
                                                            .replace(/[^\w-]+/g, '')
                                                    );
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl>
                                        <Input placeholder="product-slug" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="base_price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Base Price</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Product description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {/* ─── Gen-Z Metadata Section ─── */}
                        <div className="p-4 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl space-y-4">
                            <h3 className="text-sm font-black text-fuchsia-600 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" />
                                Gen-Z & Material Details
                            </h3>
                            
                            <FormField
                                control={form.control}
                                name="metadata.genz_tagline"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-fuchsia-700">Gen-Z Tagline</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Main Character Energy ONLY 💅" {...field} className="bg-white border-fuchsia-200 focus-visible:ring-fuchsia-300" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="metadata.fabric"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Fabric</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. 100% Organic Cotton" {...field} className="bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="metadata.material"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold text-slate-700">Material</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Breathable Mesh" {...field} className="bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* ─── Advanced Content Management ─── */}
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-6">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-900 rounded-full" />
                                Advanced Tab Content
                            </h3>

                            <FormField
                                control={form.control}
                                name="metadata.shipping_info"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700">Shipping & Returns (Override)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="If empty, standard policy will show." {...field} className="bg-white min-h-[100px]" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="metadata.size_guide_html"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-700">Size Guide Details</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Additional size notes or custom table data..." {...field} className="bg-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Perks Management */}
                            <div className="space-y-4">
                                <FormLabel className="text-xs font-bold text-slate-700 uppercase tracking-wider">Product Perks (About Section)</FormLabel>
                                <div className="grid gap-3">
                                    {[0, 1, 2, 3].map((index) => (
                                        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                            <FormField
                                                control={form.control}
                                                name={`metadata.perks.${index}.label`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Perk Label" {...field} className="text-xs font-bold" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`metadata.perks.${index}.desc`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="Perk Description" {...field} className="text-xs" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ─── Collections & Campaigns ─── */}
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                                Collections & Campaigns
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Select which collections this product should appear in.</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {collections.map((col: any) => (
                                    <div key={col.id} className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                        <Checkbox 
                                            id={`col-${col.id}`} 
                                            checked={selectedCollections.includes(col.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedCollections([...selectedCollections, col.id]);
                                                } else {
                                                    setSelectedCollections(selectedCollections.filter(id => id !== col.id));
                                                }
                                            }}
                                        />
                                        <label htmlFor={`col-${col.id}`} className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                            {col.name}
                                        </label>
                                    </div>
                                ))}
                                {collections.length === 0 && (
                                    <p className="text-xs text-slate-400 italic col-span-2">No active collections found. Create one in the Marketing tab.</p>
                                )}
                            </div>
                        </div>
                        <FormField
                            control={form.control}
                            name="featured"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Featured</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <FormLabel>Images</FormLabel>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {/* Existing Images */}
                                {existingImages.map((image) => (
                                    <div key={image.id} className="relative aspect-square border-2 border-stone-100 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                                        <Image
                                            src={image.image_url}
                                            alt="Product"
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => handleImageDelete(image.id)}
                                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                                title="Delete existing image"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded text-[10px] font-bold text-stone-600 border border-stone-200">
                                            Existing
                                        </div>
                                    </div>
                                ))}

                                {/* New Image Previews */}
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative aspect-square border-2 border-dashed border-deep-forest/30 rounded-xl overflow-hidden group bg-stone-50">
                                        <Image
                                            src={preview}
                                            alt="New selection"
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeNewImage(index)}
                                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                                title="Remove selection"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-deep-forest text-white rounded text-[10px] font-bold shadow-sm">
                                            New
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="relative">
                                <Input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label
                                    htmlFor="image-upload"
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-stone-300 rounded-xl cursor-pointer bg-stone-50 hover:bg-stone-100 hover:border-stone-400 transition-all"
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Plus className="w-8 h-8 mb-3 text-stone-400" />
                                        <p className="mb-2 text-sm text-stone-500 font-semibold text-center px-4">
                                            Click to upload multiple images or drag and drop
                                        </p>
                                        <p className="text-xs text-stone-400">
                                            PNG, JPG or WEBP
                                        </p>
                                    </div>
                                </label>
                            </div>
                            <p className="text-xs text-stone-400 mt-3 flex items-center gap-1">
                                <span className="font-bold text-stone-600">{images.length}</span> newly selected,
                                <span className="font-bold text-stone-600 ml-1">{existingImages.length}</span> existing.
                                Images are uploaded immediately upon saving.
                            </p>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <FormLabel>Variants</FormLabel>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ size: '', color: '', stock: 0, sku: '' })}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Variant
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 items-end border p-4 rounded-md relative">
                                        <FormField
                                            control={form.control}
                                            name={`variants.${index}.size`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Size</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="Size" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`variants.${index}.color`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Color</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} placeholder="Color" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`variants.${index}.stock`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Stock</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} placeholder="Stock" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? 'Update Product' : 'Create Product'}
                </Button>
            </form>
        </Form>
    );
}
