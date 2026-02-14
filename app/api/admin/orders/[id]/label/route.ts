import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const supabase = await createClient();
    const { id } = params;

    // Verify Admin
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mock Label Generation Logic
    const trackingNumber = `TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Update Order
    const { error } = await supabase
        .from('orders')
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
