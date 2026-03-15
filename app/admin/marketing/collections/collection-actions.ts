'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveCollectionAction(collectionId: string | null, collectionData: any, products: any[]) {
    const supabase = await createAdminClient();

    try {
        let finalId = collectionId;

        if (collectionId) {
            const { error } = await (supabase.from('collections' as unknown as any))
                .update(collectionData)
                .eq('id', collectionId);
            if (error) throw error;
        } else {
            const { data, error } = await (supabase.from('collections' as unknown as any))
                .insert([collectionData])
                .select()
                .single();
            if (error) throw error;
            finalId = (data as any).id;
        }

        // Sync Products (Only for Manual collections)
        if (collectionData.type === 'manual') {
            await (supabase.from('collection_products' as unknown as any)).delete().eq('collection_id', finalId);
            
            if (products.length > 0) {
                const mappings = products.map((p, index) => ({
                    collection_id: finalId,
                    product_id: p.id,
                    manual_display_order: index
                }));
                const { error: mappingError } = await (supabase.from('collection_products' as unknown as any))
                    .insert(mappings);
                if (mappingError) throw mappingError;
            }
        } else {
            await (supabase.from('collection_products' as unknown as any)).delete().eq('collection_id', finalId);
        }

        // Revalidate caches
        revalidatePath('/admin/marketing/collections');
        revalidatePath(`/admin/marketing/collections/${finalId}/edit`);
        revalidatePath(`/collections/${collectionData.slug}`);
        
        return { success: true, id: finalId };
    } catch (error: any) {
        console.error('saveCollectionAction error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCollectionAction(id: string) {
    const supabase = await createAdminClient();
    try {
        const { error } = await (supabase.from('collections' as unknown as any)).delete().eq('id', id);
        if (error) throw error;
        
        revalidatePath('/admin/marketing/collections');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleCollectionStatusAction(id: string, active: boolean) {
    const supabase = await createAdminClient();
    try {
        const { error } = await (supabase.from('collections' as unknown as any))
            .update({ is_active: active })
            .eq('id', id);
        if (error) throw error;
        
        revalidatePath('/admin/marketing/collections');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
