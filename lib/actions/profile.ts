'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
});

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        fullName: formData.get('fullName') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
    };

    const validatedFields = profileSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: validatedFields.error.flatten().fieldErrors.fullName?.[0]
                || validatedFields.error.flatten().fieldErrors.email?.[0]
                || 'Invalid input',
        };
    }

    const { fullName, phone, email } = validatedFields.data;

    // 1. Check for duplicate phone number
    if (phone) {
        const { data: existingPhoneProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .neq('id', user.id)
            .maybeSingle();

        if (existingPhoneProfile) {
            return { 
                success: false, 
                message: 'This phone number is already linked to another account. Please use a different number or contact support.' 
            };
        }
    }

    // 2. Check for duplicate email
    if (email) {
        const { data: existingEmailProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .neq('id', user.id)
            .maybeSingle();

        if (existingEmailProfile) {
            return { 
                success: false, 
                message: 'This email is already linked to another account. Please use a different email or contact support.' 
            };
        }
    }

    // 3. Update the profiles table (name + phone + email)
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            phone: phone || null,
            email: email || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    if (profileError) {
        console.error('Profile update error:', profileError);
        return { success: false, message: 'Failed to update profile' };
    }

    revalidatePath('/account');
    revalidatePath('/account/profile');
    return { success: true, message: 'Profile updated successfully!' };
}
