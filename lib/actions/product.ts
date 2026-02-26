'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteProduct(productId: string) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    const supabase = await createClient();

    // 2. Soft Delete product
    const { error } = await (supabase
        .from('products') as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', productId);

    if (error) {
        console.error('Error deleting product:', error);
        return { success: false, message: 'Failed to delete product' };
    }

    revalidatePath('/admin/products');
    return { success: true, message: 'Product archived successfully' };
}

import { generateEmbedding } from '@/lib/ai/embedding';

export async function createProduct(data: any) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    const supabase = await createClient();

    // Generate Embedding
    const embeddingText = `${data.name} ${data.description || ''} ${data.category_slug || ''}`;
    const embedding = await generateEmbedding(embeddingText);

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
            embedding: embedding as any // Cast for vector type
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
    return { success: true, message: 'Product created', productId: newProduct.id };
}

export async function updateProduct(productId: string, data: any) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return { success: false, message: 'Forbidden' };
    }

    const supabase = await createClient();

    // Generate Embedding
    const embeddingText = `${data.name} ${data.description || ''} ${data.category_slug || ''}`;
    const embedding = await generateEmbedding(embeddingText);

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
            embedding: embedding as any
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
    revalidatePath(`/products/${data.slug}`);
    return { success: true, message: 'Product updated', productId };
}
