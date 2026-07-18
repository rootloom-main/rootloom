'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function ensureProfileExists(userId: string, user: any) {
    const adminSupabase = await createAdminClient() as any;
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

    if (!profile) {
        console.log(`Auto-creating missing profile for user: ${userId}`);
        const { error } = await adminSupabase
            .from('profiles')
            .insert({
                id: userId,
                email: user.email || null,
                phone: user.phone || null,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                role: 'user'
            });
        if (error) {
            console.error('Failed to auto-create profile:', error);
        }
    }
}

const addressSchema = z.object({
    full_name: z.string().min(1, 'Full name is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    address_line1: z.string().min(1, 'Address Line 1 is required'),
    address_line2: z.string().optional().or(z.literal('')),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().default('India'),
    is_default: z.boolean().default(false),
    type: z.string().default('Home'),
});

export type AddressFormData = z.infer<typeof addressSchema>;

export async function getAddresses() {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

    if (error) {
        console.error('Error fetching addresses:', error);
        return [];
    }

    return data || [];
}

export async function addAddress(data: AddressFormData) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const validation = addressSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Invalid data', errors: validation.error.flatten() };
    }

    // Ensure profile exists to prevent foreign key violations (fk_addresses_profiles)
    await ensureProfileExists(user.id, user);

    // If setting as default, unset others first
    if (data.is_default) {
        await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);
    }

    const { data: newAddress, error } = await supabase
        .from('addresses')
        .insert({
            ...data,
            address_line2: data.address_line2 || null,
            user_id: user.id
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding address:', error);
        return { success: false, message: 'Failed to add address' };
    }

    revalidatePath('/account/addresses');
    revalidatePath('/account');
    return { success: true, message: 'Address added successfully', data: newAddress };
}

export async function updateAddress(id: string, data: AddressFormData) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const validation = addressSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, message: 'Invalid data', errors: validation.error.flatten() };
    }

    // Ensure profile exists to prevent foreign key violations (fk_addresses_profiles)
    await ensureProfileExists(user.id, user);

    // If setting as default, unset others first
    if (data.is_default) {
        await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', user.id);
    }

    const { data: updatedAddress, error } = await supabase
        .from('addresses')
        .update({
            ...data,
            address_line2: data.address_line2 || null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

    if (error) {
        console.error('Error updating address:', error);
        return { success: false, message: 'Failed to update address' };
    }

    revalidatePath('/account/addresses');
    revalidatePath('/account');
    return { success: true, message: 'Address updated successfully', data: updatedAddress };
}

export async function deleteAddress(id: string) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting address:', error);
        return { success: false, message: 'Failed to delete address' };
    }

    revalidatePath('/account/addresses');
    revalidatePath('/account');
    return { success: true, message: 'Address deleted successfully' };
}

export async function setDefaultAddress(id: string) {
    const supabase = await createClient() as any;
    const user = await getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    // Unset all first
    await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

    // Set target as default
    const { error } = await supabase
        .from('addresses')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error setting default address:', error);
        return { success: false, message: 'Failed to set default address' };
    }

    revalidatePath('/account/addresses');
    revalidatePath('/account');
    return { success: true, message: 'Default address updated successfully' };
}
