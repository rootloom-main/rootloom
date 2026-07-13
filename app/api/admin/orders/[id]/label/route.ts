import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendOrderShippedWhatsApp } from '@/lib/whatsapp';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { isAdmin } = await import('@/lib/utils/auth');
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { id } = await params;

    const { trackingNumber, trackingUrl } = await req.json();
    if (!trackingNumber) {
        return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 });
    }
    if (!trackingUrl) {
        return NextResponse.json({ error: 'Tracking link is required' }, { status: 400 });
    }

    try {
        new URL(trackingUrl);
    } catch {
        return NextResponse.json({ error: 'Tracking link must be a valid URL' }, { status: 400 });
    }

    const { data: order } = await supabase
        .from('orders')
        .select('order_number, user_id, profiles(full_name, phone)')
        .eq('id', id)
        .single();

    // Update Order
    const updatePayload = {
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        status: 'shipped',
        updated_at: new Date().toISOString()
    };

    let { error } = await (supabase
        .from('orders') as any)
        .update(updatePayload)
        .eq('id', id);

    if (error && String(error.message || '').includes('tracking_url')) {
        const { error: fallbackError } = await (supabase
            .from('orders') as any)
            .update({
            tracking_number: trackingNumber,
            status: 'shipped',
            updated_at: new Date().toISOString()
            })
            .eq('id', id);
        error = fallbackError;
    }

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const profile = Array.isArray((order as any)?.profiles) ? (order as any).profiles[0] : (order as any)?.profiles;
    if (profile?.phone && (order as any)?.order_number) {
        sendOrderShippedWhatsApp(
            profile.phone,
            profile.full_name || 'Customer',
            (order as any).order_number,
            trackingNumber,
            trackingUrl
        ).catch((error) => console.error('[WhatsApp] Failed to send shipped automation', error));
    }

    return NextResponse.json({
        message: 'Order marked as shipped successfully',
        trackingNumber,
        trackingUrl
    });
}
