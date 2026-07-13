'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redis } from '@/lib/redis';
import { sendRestockAlertWhatsApp } from '@/lib/whatsapp';
import { recordOpsEvent } from '@/lib/ops-events';

export async function deleteProduct(productId: string) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    const supabase = await createClient();

    // 2. Hard Delete product (cascades to variants, images, carts automatically)
    const { error } = await (supabase
        .from('products') as any)
        .delete()
        .eq('id', productId);

    if (error) {
        console.error('Error deleting product:', error);
        return { success: false, message: 'Failed to delete product' };
    }

    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/');

    // Invalidate Search Cache
    if (redis) {
        await redis.flushall();
    }

    return { success: true, message: 'Product permanently deleted successfully' };
}

export async function deleteVariant(variantId: string) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    const supabase = await createClient();

    const { error } = await (supabase
        .from('product_variants') as any)
        .delete()
        .eq('id', variantId);

    if (error) {
        console.error('Error deleting variant:', error);
        return { success: false, message: 'Failed to delete variant' };
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/products');
    revalidatePath('/shop');

    return { success: true, message: 'Variant permanently deleted successfully' };
}

export async function createProduct(data: any) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    const supabase = await createClient();


    // Insert Product
    const { data: newProduct, error } = await (supabase
        .from('products') as any)
        .insert({
            name: data.name,
            slug: data.slug,
            description: data.description,
            category_id: data.category_id,
            base_price: data.base_price,
            featured: data.featured,
            status: data.status,
            metadata: data.metadata || {},
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
        return { success: false, message: 'Failed to create product' };
    }

    // Insert Variants
    if (data.variants && data.variants.length > 0) {
        const variantsToInsert = data.variants.map((v: any) => ({
            product_id: newProduct.id,
            size: v.size,
            color: v.color,
            stock: v.stock,
            sku: v.sku || `${data.slug}-${v.size}-${v.color}`,
        }));

        const { error: variantError } = await (supabase.from('product_variants') as any).insert(variantsToInsert);
        if (variantError) console.error('Error creating variants:', variantError);
    }

    revalidatePath('/admin/products');
    revalidatePath('/shop');
    revalidatePath('/');

    // Invalidate Search Cache
    if (redis) {
        await redis.flushall();
    }

    return { success: true, message: 'Product created', productId: newProduct?.id };
}

export async function updateProduct(productId: string, data: any) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    const supabase = await createClient();


    // Update Product
    const { error } = await (supabase
        .from('products') as any)
        .update({
            name: data.name,
            slug: data.slug,
            description: data.description,
            category_id: data.category_id,
            base_price: data.base_price,
            featured: data.featured,
            status: data.status,
            metadata: data.metadata || {},
        })
        .eq('id', productId);

    if (error) {
        console.error('Error updating product:', error);
        return { success: false, message: 'Failed to update product' };
    }

    // Update Variants (Wipe and Recreate for MVP)
    await (supabase.from('product_variants') as any).delete().eq('product_id', productId);

    if (data.variants && data.variants.length > 0) {
        const variantsToInsert = data.variants.map((v: any) => ({
            product_id: productId,
            size: v.size,
            color: v.color,
            stock: v.stock,
            sku: v.sku || `${data.slug}-${v.size}-${v.color}`,
        }));

        const { error: variantError } = await (supabase.from('product_variants') as any).insert(variantsToInsert);
        if (variantError) console.error('Error updating variants:', variantError);
    }

    revalidatePath('/admin/products');
    revalidatePath(`/product/${data.slug}`);
    revalidatePath('/shop');
    revalidatePath('/');

    // Invalidate Search Cache
    if (redis) {
        await redis.flushall();
    }

    return { success: true, message: 'Product updated', productId };
}

import { ProductService } from '@/lib/services/productService';

export async function getFilteredProducts(params: {
    categorySlug?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    limit?: number;
}) {
    try {
        const products = await ProductService.getProducts(params);
        return { success: true, products };
    } catch (error) {
        console.error('Action: getFilteredProducts failed:', error);
        return { success: false, products: [], error: 'Failed to fetch products' };
    }
}

export async function restockVariant(variantId: string, quantity: number) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    if (quantity <= 0) {
        return { success: false, message: 'Quantity must be greater than zero' };
    }

    const supabase = await createClient();

    const { data: variantInfo } = await (supabase
        .from('product_variants')
        .select('id, product_id, size, color, product:products(id, name, slug)')
        .eq('id', variantId)
        .single() as any);

    // Call RPC to increment stock
    const { error } = await supabase.rpc('increment_stock', {
        variant_id: variantId,
        qty: quantity
    });

    if (error) {
        console.error('Error restocking variant:', error);
        return { success: false, message: 'Failed to restock variant' };
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/admin/products');
    revalidatePath('/shop');

    if (variantInfo?.product_id) {
        const productData = Array.isArray(variantInfo.product) ? variantInfo.product[0] : variantInfo.product;
        const { data: waitlistRows } = await (supabase
            .from('product_waitlist' as any)
            .select('id, phone, email, user_id')
            .eq('product_id', variantInfo.product_id)
            .eq('status', 'pending')
            .or(`variant_id.eq.${variantId},variant_id.is.null`) as any);

        if (waitlistRows?.length) {
            await Promise.allSettled(waitlistRows.map(async (row: any) => {
                if (row.phone) {
                    await sendRestockAlertWhatsApp(
                        row.phone,
                        'Customer',
                        productData?.name || 'Product',
                        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.in'}/product/${productData?.slug}`
                    );
                }

                await (supabase
                    .from('product_waitlist' as any)
                    .update({
                        status: 'notified',
                        notified_at: new Date().toISOString(),
                    } as any)
                    .eq('id', row.id) as any);
            }));

            await recordOpsEvent({
                eventType: 'inventory.restock_waitlist',
                status: 'success',
                reference: variantId,
                metadata: {
                    notified_count: waitlistRows.length,
                    product_id: variantInfo.product_id,
                },
            });
        }
    }

    return { success: true, message: `Successfully added ${quantity} units to stock` };
}
