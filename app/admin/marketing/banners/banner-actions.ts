'use server';

import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import { delCache } from '@/lib/redis';

export async function createBannerAction(formData: FormData) {
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Verify Admin Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { success: false, error: 'Unauthorized' };
    }

    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const link = formData.get('link') as string;
    const collectionIdRaw = formData.get('collection_id') as string | null;
    const collection_id = (collectionIdRaw && collectionIdRaw !== 'none') ? collectionIdRaw : null;
    const position = formData.get('position') as string;
    const active = formData.get('active') === 'true';
    const display_order = parseInt(formData.get('display_order') as string) || 0;
    const badge = formData.get('badge') as string;
    const cta = formData.get('cta') as string;
    const theme = formData.get('theme') as string;
    const imageFile = formData.get('image') as File | null;
    const existingImageUrl = formData.get('existing_image_url') as string | null;

    if (!title) {
        return { success: false, error: 'Title is required' };
    }

    if (!imageFile && !existingImageUrl) {
        return { success: false, error: 'Banner image is required' };
    }

    try {
        let imageUrl = existingImageUrl || '';

        // 1. Upload Image (Only if file provided)
        if (imageFile && imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('banners')
                .getPublicUrl(filePath);
            
            imageUrl = publicUrl;
        }

        // Resolve collection link if not provided manually
        let finalLink = link || null;
        if (collection_id && !finalLink) {
            const { data: col } = await supabase
                .from('collections')
                .select('slug')
                .eq('id', collection_id)
                .single();
            if (col?.slug) {
                finalLink = `/collections/${col.slug}`;
            }
        }

        // 3. Create Record
        const bannerData: any = {
            title,
            description: description || null,
            link: finalLink,
            collection_id,
            position,
            active,
            display_order,
            image_url: imageUrl,
            metadata: {
                badge,
                cta,
                theme
            }
        };

        const { error: dbError } = await supabase
            .from('banners')
            .insert(bannerData);

        if (dbError) throw dbError;

        await delCache('home:banners');
        await delCache('home:sections');
        revalidatePath('/');
        revalidatePath('/admin/marketing/banners');
        return { success: true };

    } catch (error: any) {
        console.error('Action error creating banner:', error);
        return { success: false, error: error.message || 'Failed to create banner' };
    }
}

export async function updateBannerAction(bannerId: string, formData: FormData) {
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // Verify Admin Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { success: false, error: 'Unauthorized' };
    }

    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const link = formData.get('link') as string;
    const collectionIdRaw = formData.get('collection_id') as string | null;
    const collection_id = (collectionIdRaw && collectionIdRaw !== 'none') ? collectionIdRaw : null;
    const position = formData.get('position') as string;
    const active = formData.get('active') === 'true';
    const display_order = parseInt(formData.get('display_order') as string) || 0;
    const badge = formData.get('badge') as string;
    const cta = formData.get('cta') as string;
    const theme = formData.get('theme') as string;
    const imageFile = formData.get('image') as File | null;
    const existingImageUrl = formData.get('existing_image_url') as string | null;

    if (!title || !bannerId) {
        return { success: false, error: 'Title and Banner ID are required' };
    }

    try {
        let imageUrl = existingImageUrl;

        // 1. Upload New Image (If provided)
        if (imageFile && imageFile.size > 0) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('banners')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('banners')
                .getPublicUrl(filePath);
            
            imageUrl = publicUrl;
        }

        // Resolve collection link if not provided manually
        let finalLink = link || null;
        if (collection_id && !finalLink) {
            const { data: col } = await supabase
                .from('collections')
                .select('slug')
                .eq('id', collection_id)
                .single();
            if (col?.slug) {
                finalLink = `/collections/${col.slug}`;
            }
        }

        const updateData: any = {
            title,
            description: description || null,
            link: finalLink,
            collection_id,
            position,
            active,
            display_order,
            image_url: imageUrl || undefined,
            metadata: {
                badge,
                cta,
                theme
            }
        };

        const { error: dbError } = await supabase
            .from('banners')
            .update(updateData)
            .eq('id', bannerId);

        if (dbError) throw dbError;

        await delCache('home:banners');
        await delCache('home:sections');
        revalidatePath('/');
        revalidatePath('/admin/marketing/banners');
        return { success: true };
    } catch (error: any) {
        console.error('Action error updating banner:', error);
        return { success: false, error: error.message || 'Failed to update banner' };
    }
}

export async function toggleBannerAction(bannerId: string, currentActive: boolean) {
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('banners')
        .update({ active: !currentActive })
        .eq('id', bannerId);

    if (error) return { success: false, error: error.message };

    await delCache('home:banners');
    await delCache('home:sections');
    revalidatePath('/');
    revalidatePath('/admin/marketing/banners');
    return { success: true };
}

export async function deleteBannerAction(bannerId: string) {
    const supabase = await createSSRClient();
    const user = await getCurrentUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', bannerId);

    if (error) return { success: false, error: error.message };

    await delCache('home:banners');
    await delCache('home:sections');
    revalidatePath('/');
    revalidatePath('/admin/marketing/banners');
    return { success: true };
}
