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

    // Mock Label Generation Logic
    const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

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
        message: 'Shipping label generated successfully',
        label: {
            trackingNumber,
            carrier: 'MockCarrier',
            url: `https://mockcarrier.com/track/${trackingNumber}`
        }
    });
}
