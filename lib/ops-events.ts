import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export type OpsEventInput = {
    eventType: string;
    status: string;
    channel?: string | null;
    userId?: string | null;
    orderId?: string | null;
    paymentId?: string | null;
    reference?: string | null;
    metadata?: Record<string, any>;
};

export async function recordOpsEvent(event: OpsEventInput) {
    try {
        const supabase = createAdminClient();
        await (supabase.from('ops_events' as any).insert({
            event_type: event.eventType,
            status: event.status,
            channel: event.channel || null,
            user_id: event.userId || null,
            order_id: event.orderId || null,
            payment_id: event.paymentId || null,
            reference: event.reference || null,
            metadata: event.metadata || {},
        } as any) as any);
    } catch (error) {
        logger.warn('Failed to record ops event', {
            eventType: event.eventType,
            status: event.status,
            error,
        });
    }
}
