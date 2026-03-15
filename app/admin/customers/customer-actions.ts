'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { revalidatePath } from 'next/cache';

const resend = new Resend(process.env.RESEND_API_KEY);
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

export async function syncCustomersToResend() {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'RESEND_API_KEY is not configured.' };
    }

    if (!AUDIENCE_ID) {
        return { 
            success: false, 
            error: 'RESEND_AUDIENCE_ID is not configured. Please add it to your environment variables to enable synchronization.' 
        };
    }

    try {
        const supabase = await createAdminClient();
        
        // Fetch all customers (profiles)
        const { data: customers, error: fetchError } = await supabase
            .from('profiles')
            .select('email, full_name, phone')
            .not('email', 'is', null);

        if (fetchError) throw fetchError;
        if (!customers || customers.length === 0) {
            return { success: true, message: 'No customers found to sync.' };
        }

        // Resend supports batching or single additions. 
        // For simplicity and to handle potentially large lists, we'll use the Contacts API.
        // Note: Resend contacts API might have rate limits, so for very large lists, 
        // more complex batching logic would be needed.
        
        let syncedCount = 0;
        let errorCount = 0;

        for (const customer of customers) {
            try {
                const { error: syncError } = await resend.contacts.create({
                    email: customer.email,
                    firstName: customer.full_name?.split(' ')[0] || '',
                    lastName: customer.full_name?.split(' ').slice(1).join(' ') || '',
                    unsubscribed: false,
                    audienceId: AUDIENCE_ID,
                });

                if (syncError) {
                    // Check if it's "Already exists" - many APIs behave this way
                    // Resend documentation says it returns an error if contact exists.
                    // We might want to update instead, but 'create' is simpler for a first pass.
                    console.error(`Error syncing ${customer.email}:`, syncError);
                    errorCount++;
                } else {
                    syncedCount++;
                }
            } catch (e) {
                console.error(`Failed to sync ${customer.email}`, e);
                errorCount++;
            }
        }

        revalidatePath('/admin/customers');
        return { 
            success: true, 
            message: `Successfully synced ${syncedCount} customers. ${errorCount > 0 ? `${errorCount} failed (some may already exist).` : ''}` 
        };
    } catch (error: any) {
        console.error('Full Sync Error:', error);
        return { success: false, error: error.message || 'An unexpected error occurred during sync.' };
    }
}

export async function getAllCustomersForExport() {
    try {
        const supabase = await createAdminClient();
        const { data: customers, error } = await supabase
            .from('profiles')
            .select(`
                email,
                full_name,
                phone,
                role,
                created_at,
                orders:orders(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { 
            success: true, 
            data: customers.map(c => ({
                Name: c.full_name || 'N/A',
                Email: c.email,
                Phone: c.phone || 'N/A',
                Role: c.role,
                Joined: new Date(c.created_at).toLocaleDateString(),
                Orders: c.orders?.[0]?.count || 0
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
