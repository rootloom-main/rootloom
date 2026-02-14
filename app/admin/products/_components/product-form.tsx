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
}

export function ProductForm({ initialData, categories }: ProductFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<any[]>(
        initialData?.product_images || []
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
                                {existingImages.map((image) => (
                                    <div key={image.id} className="relative aspect-square border rounded overflow-hidden group">
                                        <Image
                                            src={image.image_url}
                                            alt="Product"
                                            fill
                                            className="object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleImageDelete(image.id)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setImages(Array.from(e.target.files));
                                    }
                                }}
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                Upload new images. Existing images are shown above.
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
