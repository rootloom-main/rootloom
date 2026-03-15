import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export type JobType = 'send_email' | 'process_order' | 'whatsapp_broadcast';

export async function enqueueJob(type: JobType, payload: any) {
    const supabase = await createAdminClient(); 

    const { error } = await (supabase.from('jobs') as any).insert({
        type,
        payload,
        status: 'pending',
    });

    if (error) {
        logger.error('Failed to enqueue job', { type, error: error.message });
        throw new Error('Failed to enqueue job');
    }

    logger.info('Job enqueued', { type });
}

export async function processNextJob() {
    // This would be called by a CRON endpoint
    const supabase = await createAdminClient();

    // Fetch next pending job
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(1) as { data: any[] | null, error: any };

    if (error || !jobs || jobs.length === 0) return null;

    const job = jobs[0];

    // Lock job
    await (supabase.from('jobs') as any).update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);

    try {
        logger.info('Processing job', { id: job.id, type: job.type });

        // Process logic here based on job.type
        if (job.type === 'whatsapp_broadcast') {
            const campaignId = job.payload.campaignId;
            const supabaseAdmin = await createAdminClient();

            // 1. Fetch Campaign
            const { data: campaign } = await (supabaseAdmin as any)
                .from('marketing_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

            // Update status to processing
            await (supabaseAdmin as any).from('marketing_campaigns').update({ status: 'processing' }).eq('id', campaignId);

            // 2. Fetch Recipients based on audience_type
            let recipients: any[] = [];
            
            if (campaign.audience_type === 'all') {
                const { data } = await supabaseAdmin.from('profiles').select('full_name, phone').not('phone', 'is', null);
                recipients = data || [];
            } else if (campaign.audience_type === 'buyers') {
                const { data } = await supabaseAdmin.rpc('get_marketing_recipients_buyers' as any);
                recipients = data || [];
            } else if (campaign.audience_type === 'abandoned_cart') {
                const { data } = await supabaseAdmin.rpc('get_marketing_recipients_abandoned' as any);
                recipients = data || [];
            }

            // 3. Send Messages
            let sentCount = 0;
            for (const recipient of recipients) {
                if (!recipient.phone) continue;

                // Replace template variables
                const message = campaign.message_body
                    .replace(/{{name}}/g, recipient.full_name || 'Customer')
                    .replace(/{{store_url}}/g, process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.com');

                const success = await sendWhatsAppMessage(recipient.phone, message);
                if (success) sentCount++;
            }

            // 4. Final Update
            await (supabaseAdmin as any).from('marketing_campaigns').update({
                status: 'completed',
                sent_count: sentCount,
                recipient_count: recipients.length,
                completed_at: new Date().toISOString()
            }).eq('id', campaignId);
        }

        // Complete
        await (supabase.from('jobs') as any).update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', job.id);
    } catch (err: any) {
        logger.error('Job failed', { id: job.id, error: err.message });

        const nextStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending';
        await (supabase.from('jobs') as any).update({
            status: nextStatus,
            attempts: job.attempts + 1,
            last_error: err.message,
            updated_at: new Date().toISOString()
        }).eq('id', job.id);
    }
}
