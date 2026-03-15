'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { enqueueJob } from '@/lib/jobs';
import { revalidatePath } from 'next/cache';

export async function getAudienceCount(type: string) {
    const supabase = await createAdminClient();
    
    if (type === 'all') {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .not('phone', 'is', null);
        return count || 0;
    } else if (type === 'buyers') {
        const { data } = await supabase.rpc('get_marketing_recipients_buyers' as any);
        return (data as any[])?.length || 0;
    } else if (type === 'abandoned_cart') {
        const { data } = await supabase.rpc('get_marketing_recipients_abandoned' as any);
        return (data as any[])?.length || 0;
    }
    
    return 0;
}

export async function createCampaignAction(formData: any) {
    const supabase = await createAdminClient();
    
    const { data: campaign, error } = await (supabase as any).from('marketing_campaigns').insert({
        name: formData.name,
        audience_type: formData.audienceType,
        message_body: formData.messageBody,
        status: 'draft'
    }).select().single();
    
    if (error) {
        console.error('Error creating campaign:', error);
        return { error: error.message };
    }
    
    revalidatePath('/admin/marketing/campaigns');
    return { success: true, campaign };
}

export async function sendCampaignAction(campaignId: string) {
    const supabase = await createAdminClient();
    
    // Update status to scheduled
    const { error } = await (supabase as any).from('marketing_campaigns')
        .update({ status: 'scheduled', scheduled_at: new Date().toISOString() })
        .eq('id', campaignId);
    
    if (error) return { error: error.message };
    
    // Enqueue background job
    await enqueueJob('whatsapp_broadcast', { campaignId });
    
    revalidatePath('/admin/marketing/campaigns');
    return { success: true };
}

export async function deleteCampaignAction(id: string) {
    const supabase = await createAdminClient();
    const { error } = await (supabase as any).from('marketing_campaigns').delete().eq('id', id);
    
    if (error) return { error: error.message };
    
    revalidatePath('/admin/marketing/campaigns');
    return { success: true };
}
