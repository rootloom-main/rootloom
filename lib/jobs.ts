import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { getRetryDelayMs } from '@/lib/utils/retry-backoff';

export type JobType = 'send_email' | 'process_order' | 'whatsapp_broadcast';

export const WHATSAPP_RECIPIENT_BATCH_SIZE = 20;
const JOB_MAX_ATTEMPTS = 3;
const STALE_RECIPIENT_LEASE_MINUTES = 10;

export async function enqueueJob(type: JobType, payload: any) {
    const supabase = await createAdminClient();
    const { error } = await (supabase.from('jobs') as any).insert({ type, payload, status: 'pending' });
    if (error) {
        logger.error('Failed to enqueue job', { type, error: error.message });
        throw new Error('Failed to enqueue job');
    }
    logger.info('Job enqueued', { type });
}

async function processWhatsAppBroadcast(supabase: any, job: any) {
    const campaignId = job.payload?.campaignId;
    if (!campaignId) throw new Error('WhatsApp broadcast job is missing campaignId');

    const { data: recipientCount, error: initializeError } = await supabase.rpc(
        'initialize_marketing_campaign_recipients',
        { p_campaign_id: campaignId },
    );
    if (initializeError) throw initializeError;
    const campaignMessage = await loadCampaignMessage(supabase, campaignId);

    // A worker that died after claiming a recipient may have sent it. Do not
    // submit that message again; leave an auditable unknown result for review.
    const { error: staleRecipientError } = await supabase.from('marketing_campaign_recipients')
        .update({ status: 'unknown', last_error: 'Worker stopped during provider dispatch; not retried to avoid duplicate delivery' })
        .eq('campaign_id', campaignId)
        .eq('status', 'sending')
        .lt('dispatch_started_at', new Date(Date.now() - STALE_RECIPIENT_LEASE_MINUTES * 60_000).toISOString());
    if (staleRecipientError) throw staleRecipientError;

    const { data: recipients, error: recipientError } = await supabase
        .from('marketing_campaign_recipients')
        .select('id, phone, full_name, attempts')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .lte('next_attempt_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(WHATSAPP_RECIPIENT_BATCH_SIZE);
    if (recipientError) throw recipientError;

    let claimed = 0;
    let sentThisBatch = 0;
    for (const recipient of recipients || []) {
        const { data: locked, error: lockError } = await supabase
            .from('marketing_campaign_recipients')
            .update({
                status: 'sending',
                attempts: (recipient.attempts || 0) + 1,
                dispatch_started_at: new Date().toISOString(),
                last_error: null,
            })
            .eq('id', recipient.id)
            .eq('status', 'pending')
            .select('id')
            .maybeSingle();
        if (lockError) throw lockError;
        if (!locked) continue;
        claimed += 1;

        const body = campaignMessage
            .replace(/{{name}}/g, recipient.full_name || 'Customer')
            .replace(/{{store_url}}/g, process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.com');

        try {
            const success = await sendWhatsAppMessage(recipient.phone, body, undefined, {
                campaign_id: campaignId,
                delivery_id: recipient.id,
            });
            const { error: completionError } = await supabase
                .from('marketing_campaign_recipients')
                .update({
                    status: success ? 'sent' : 'failed',
                    sent_at: success ? new Date().toISOString() : null,
                    last_error: success ? null : 'Provider send failed; see messaging ops event',
                })
                .eq('id', recipient.id)
                .eq('status', 'sending');
            if (completionError) throw completionError;
            if (success) sentThisBatch += 1;
        } catch (error) {
            // The recipient stays in `sending` if the provider outcome is
            // ambiguous. A later worker marks it unknown and never resends it.
            throw error;
        }
    }

    const { data: progressRows, error: progressError } = await supabase.rpc(
        'get_marketing_campaign_recipient_progress',
        { p_campaign_id: campaignId },
    );
    if (progressError) throw progressError;
    const progress = Array.isArray(progressRows) ? progressRows[0] : progressRows;
    const pendingResult = Number(progress?.pending || 0);
    const sendingResult = Number(progress?.sending || 0);
    const unknownResult = Number(progress?.unknown || 0);
    const sentResult = Number(progress?.sent || 0);
    const failedResult = Number(progress?.failed || 0);

    const unresolved = unknownResult + sendingResult;
    const done = pendingResult === 0 && sendingResult === 0;
    if (done) {
        const campaignStatus = unknownResult > 0 ? 'failed' : 'completed';
        const { error: campaignError } = await supabase
            .from('marketing_campaigns')
            .update({
                status: campaignStatus,
                recipient_count: recipientCount || sentResult + failedResult,
                sent_count: sentResult,
                completed_at: new Date().toISOString(),
                error_log: unknownResult > 0 ? `${unknownResult} recipient dispatch(es) have an unknown provider result and were not retried.` : null,
            })
            .eq('id', campaignId);
        if (campaignError) throw campaignError;

        await updateJob(supabase, job.id, {
            status: unknownResult > 0 ? 'failed' : 'completed',
            locked_until: null,
            progress: sentResult + failedResult + unknownResult,
            last_error: unknownResult > 0 ? 'Unknown provider outcomes require reconciliation; no duplicate sends were attempted' : null,
        });
        return { processed: claimed, sent: sentThisBatch, remaining: 0, unresolved };
    }

    // Active sends in another invocation may still be in flight. Let their
    // worker finish; future cron invocations resume only pending recipients.
    await updateJob(supabase, job.id, {
        status: 'pending',
        locked_until: null,
        next_attempt_at: sendingResult > 0
            ? new Date(Date.now() + STALE_RECIPIENT_LEASE_MINUTES * 60_000).toISOString()
            : new Date().toISOString(),
        progress: sentResult + failedResult,
    });
    return { processed: claimed, sent: sentThisBatch, remaining: pendingResult, unresolved };
}

async function loadCampaignMessage(supabase: any, campaignId: string) {
    const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('message_body')
        .eq('id', campaignId)
        .single();
    if (error) throw error;
    return String(data.message_body || '');
}

async function updateJob(supabase: any, jobId: string, values: Record<string, unknown>) {
    const { error } = await (supabase.from('jobs') as any)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    if (error) throw error;
}

export async function processNextJob() {
    const supabase = await createAdminClient();
    const { data: jobs, error } = await (supabase as any).rpc('claim_next_job');
    if (error) throw error;
    const job = Array.isArray(jobs) ? jobs[0] : jobs;
    if (!job) return null;

    try {
        if (job.type === 'whatsapp_broadcast') {
            return await processWhatsAppBroadcast(supabase, job);
        }
        throw new Error(`Unsupported job type: ${job.type}`);
    } catch (error: any) {
        const attempts = Number(job.attempts || 0) + 1;
        const terminal = attempts >= Number(job.max_attempts || JOB_MAX_ATTEMPTS);
        const backoffMs = getRetryDelayMs(attempts);
        const message = error instanceof Error ? error.message : 'Unknown job error';
        logger.error('Job failed', { id: job.id, error: message, attempts, terminal });
        await updateJob(supabase, job.id, {
            status: terminal ? 'failed' : 'pending',
            attempts,
            next_attempt_at: terminal ? new Date().toISOString() : new Date(Date.now() + backoffMs).toISOString(),
            locked_until: null,
            last_error: message,
        });

        if (terminal && job.payload?.campaignId) {
            const { error: campaignUpdateError } = await (supabase as any).from('marketing_campaigns')
                .update({ status: 'failed', error_log: message })
                .eq('id', job.payload.campaignId);
            if (campaignUpdateError) throw campaignUpdateError;
        }
        return { id: job.id, failed: terminal, retryAt: terminal ? null : new Date(Date.now() + backoffMs).toISOString() };
    }
}
