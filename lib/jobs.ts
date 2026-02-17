import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type JobType = 'send_email' | 'process_order';

export async function enqueueJob(type: JobType, payload: any) {
    const supabase = await createClient(); // Ideally use service role client here if available for bypassing RLS

    // Note: For client-side enqueuing, we rely on RLS allowing specific inserts
    // For now, let's assume this is called from Server Actions with proper permissions

    const { error } = await supabase.from('jobs').insert({
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
    const supabase = await createClient();

    // Fetch next pending job
    const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

    if (error || !jobs || jobs.length === 0) return null;

    const job = jobs[0];

    // Lock job
    await supabase.from('jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', job.id);

    try {
        logger.info('Processing job', { id: job.id, type: job.type });

        // Process logic here based on job.type
        // if (job.type === 'send_email') ...

        // Complete
        await supabase.from('jobs').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', job.id);
    } catch (err: any) {
        logger.error('Job failed', { id: job.id, error: err.message });

        const nextStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending';
        await supabase.from('jobs').update({
            status: nextStatus,
            attempts: job.attempts + 1,
            last_error: err.message,
            updated_at: new Date().toISOString()
        }).eq('id', job.id);
    }
}
