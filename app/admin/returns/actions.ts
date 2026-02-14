'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateReturnStatus(formData: FormData) {
    const supabase = await createClient();
    const id = formData.get('id') as string;
    const status = formData.get('status') as string;

    // Verify Admin
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        throw new Error('Forbidden');
    }

    // Update Status
    const { error } = await supabase
        .from('returns')
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Failed to update return status:', error);
        throw new Error('Failed to update return status');
    }

    revalidatePath('/admin/returns');
    redirect('/admin/returns');
}
