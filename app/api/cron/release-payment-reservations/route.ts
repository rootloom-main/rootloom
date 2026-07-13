import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { releasePaymentInventory } from '@/lib/payments/reservations';
import { verifyCronRequest } from '@/lib/cron-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const cronAuth = verifyCronRequest(request);
    if (!cronAuth.ok) {
        return cronAuth.response;
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: stalePayments, error } = await (supabase
        .from('payments' as any)
        .select('*')
        .eq('status', 'pending')
        .lt('metadata->>reservation_expires_at', nowIso) as any);

    if (error) {
        console.error('[Reservations][Cron] Failed to load stale payments', error);
        return NextResponse.json({ error: 'Failed to load stale payments' }, { status: 500 });
    }

    let released = 0;
    const failures: Array<{ paymentId: string; message: string }> = [];

    for (const payment of stalePayments || []) {
        try {
            const didRelease = await releasePaymentInventory(
                supabase as any,
                payment,
                'reservation_expired'
            );

            if (didRelease) {
                released += 1;
            }
        } catch (releaseError: any) {
            console.error('[Reservations][Cron] Failed to release reservation', {
                paymentId: payment.id,
                error: releaseError,
            });
            failures.push({
                paymentId: payment.id,
                message: releaseError.message || 'Unknown release error',
            });
        }
    }

    return NextResponse.json({
        success: true,
        released,
        failures,
    });
}
