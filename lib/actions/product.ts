'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteProduct(productId: string) {
    const supabase = await createClient();

    // 1. Check if user is admin
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return { success: false, message: 'Forbidden' };
    }

    // 2. Soft Delete product
    const { error } = await supabase
        .from('products')
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
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') return { success: false, message: 'Forbidden' };

    // Generate Embedding
    const embeddingText = `${data.name} ${data.description || ''} ${data.category_slug || ''}`;
    const embedding = await generateEmbedding(embeddingText);

    // Insert Product
    const { data: newProduct, error } = await supabase
        .from('products')
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

        const { error: variantError } = await supabase.from('product_variants').insert(variantsToInsert);
        if (variantError) console.error('Error creating variants:', variantError);
    }

    revalidatePath('/admin/products');
    return { success: true, message: 'Product created', productId: newProduct.id };
}

export async function updateProduct(productId: string, data: any) {
    const supabase = await createClient();

    // Check Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Unauthorized' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') return { success: false, message: 'Forbidden' };

    // Generate Embedding
    const embeddingText = `${data.name} ${data.description || ''} ${data.category_slug || ''}`;
    const embedding = await generateEmbedding(embeddingText);

    // Update Product
    const { error } = await supabase
        .from('products')
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
    await supabase.from('product_variants').delete().eq('product_id', productId);

    if (data.variants && data.variants.length > 0) {
        const variantsToInsert = data.variants.map((v: any) => ({
            product_id: productId,
            size: v.size,
            color: v.color,
            stock: v.stock,
            sku: v.sku || `${data.slug}-${v.size}-${v.color}`,
        }));

        const { error: variantError } = await supabase.from('product_variants').insert(variantsToInsert);
        if (variantError) console.error('Error updating variants:', variantError);
    }

    revalidatePath('/admin/products');
    revalidatePath(`/products/${data.slug}`);
    return { success: true, message: 'Product updated', productId };
}
