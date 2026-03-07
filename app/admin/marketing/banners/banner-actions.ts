'use server';

import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';

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
    const link = formData.get('link') as string;
    const position = formData.get('position') as string;
    const active = formData.get('active') === 'true';
    const imageFile = formData.get('image') as File | null;

    if (!title || !imageFile) {
        return { success: false, error: 'Title and Image are required' };
    }

    try {
        // 1. Upload Image
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('banners')
            .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('banners')
            .getPublicUrl(filePath);

        // 3. Create Record
        const { error: dbError } = await supabase
            .from('banners')
            .insert({
                title,
                link,
                position,
                active,
                image_url: publicUrl
            });

        if (dbError) throw dbError;

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
    const link = formData.get('link') as string;
    const position = formData.get('position') as string;
    const active = formData.get('active') === 'true';

    if (!title || !bannerId) {
        return { success: false, error: 'Title and Banner ID are required' };
    }

    try {
        const { error: dbError } = await supabase
            .from('banners')
            .update({
                title,
                link: link || null,
                position,
                active
            })
            .eq('id', bannerId);

        if (dbError) throw dbError;

        return { success: true };
    } catch (error: any) {
        console.error('Action error updating banner:', error);
        return { success: false, error: error.message || 'Failed to update banner' };
    }
}
