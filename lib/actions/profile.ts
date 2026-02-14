'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional().or(z.literal('')),
});

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
    };

    const validatedFields = profileSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: validatedFields.error.flatten().fieldErrors.fullName?.[0] || 'Invalid input',
        };
    }

    const { fullName, phone } = validatedFields.data;

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            phone: phone || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    if (error) {
        console.error('Profile update error:', error);
        return { success: false, message: 'Failed to update profile' };
    }

    revalidatePath('/account');
    revalidatePath('/account/profile');

    return { success: true, message: 'Profile updated successfully' };
}
