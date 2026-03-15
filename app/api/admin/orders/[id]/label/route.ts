import { getCurrentUser } from '@/lib/utils/auth';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { id } = params;

    const { trackingNumber } = await req.json();
    if (!trackingNumber) {
        return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
    }

    // Update Order
    const { error } = await (supabase
        .from('orders') as any)
        .update({
            tracking_number: trackingNumber,
            status: 'shipped',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        message: 'Order marked as shipped successfully',
        trackingNumber
    });
}
