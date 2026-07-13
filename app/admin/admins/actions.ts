'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser, getUserProfile } from '@/lib/utils/auth';

const MANAGEABLE_ROLES = new Set(['user', 'admin']);

export async function updateUserRole(targetUserId: string, nextRole: 'user' | 'admin') {
    if (!targetUserId || !MANAGEABLE_ROLES.has(nextRole)) {
        return { success: false, message: 'Invalid role update request' };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, message: 'Unauthorized' };
    }

    const currentProfile = await getUserProfile();
    if (currentProfile?.role !== 'superadmin') {
        return { success: false, message: 'Forbidden' };
    }

    if (currentUser.id === targetUserId) {
        return { success: false, message: 'You cannot modify your own role' };
    }

    const adminSupabase = createAdminClient();
    const { data: targetProfile, error: fetchError } = await adminSupabase
        .from('profiles')
        .select('id, role')
        .eq('id', targetUserId)
        .single();

    if (fetchError || !targetProfile) {
        return { success: false, message: 'User not found' };
    }

    if (targetProfile.role === 'superadmin') {
        return { success: false, message: 'Superadmin roles are immutable here' };
    }

    const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
            role: nextRole,
            updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

    if (updateError) {
        console.error('Admin role update failed', updateError);
        return { success: false, message: 'Failed to update role' };
    }

    revalidatePath('/admin/admins');
    return { success: true, message: `User role updated to ${nextRole}` };
}
