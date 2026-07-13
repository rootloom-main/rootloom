'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const profileSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional().or(z.literal('')),
    email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
    dob: z.string().optional().or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
});

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient() as any;
    const adminSupabase = await createAdminClient() as any;
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const rawData = {
        fullName: (formData.get('fullName') as string) || '',
        phone: (formData.get('phone') as string) || '',
        email: (formData.get('email') as string) || '',
        dob: (formData.get('dob') as string) || '',
        gender: (formData.get('gender') as string) || '',
    };

    const validatedFields = profileSchema.safeParse(rawData);

    if (!validatedFields.success) {
        const fieldErrors = validatedFields.error.flatten().fieldErrors;
        return {
            success: false,
            message: fieldErrors.fullName?.[0]
                || fieldErrors.email?.[0]
                || fieldErrors.phone?.[0]
                || fieldErrors.dob?.[0]
                || fieldErrors.gender?.[0]
                || 'Invalid input',
        };
    }

    const { fullName, phone, email, dob, gender } = validatedFields.data;

    // 1. Check for duplicate phone number
    if (phone && formData.has('phone')) {
        const { data: existingPhoneProfile } = await adminSupabase
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
    if (email && formData.has('email')) {
        const { data: existingEmailProfile } = await adminSupabase
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

    // 3. Update the profiles table dynamically
    const updateData: any = {
        full_name: fullName,
        updated_at: new Date().toISOString(),
    };

    if (formData.has('phone')) {
        updateData.phone = phone || null;
    }

    if (formData.has('email')) {
        updateData.email = email || null;
    }

    if (formData.has('dob')) {
        updateData.dob = dob || null;
    }

    if (formData.has('gender')) {
        updateData.gender = gender || null;
    }

    const { error: profileError } = await adminSupabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

    if (profileError) {
        console.error('Profile update error:', profileError);
        return { success: false, message: 'Failed to update profile' };
    }

    revalidatePath('/account');
    revalidatePath('/account/profile');
    return { success: true, message: 'Profile updated successfully!' };
}
