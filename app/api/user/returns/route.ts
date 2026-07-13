import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { RETURN_WINDOW_DAYS, isReturnEligible } from '@/lib/returns/policy';

const MAX_EVIDENCE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: NextRequest) {
    const supabase = await createSSRClient();
    const adminSupabase = createAdminClient();
    const formData = await req.formData();

    const orderId = formData.get('orderId') as string;
    const orderItemId = formData.get('orderItemId') as string;
    const reason = formData.get('reason') as string;
    const comments = formData.get('comments') as string;
    const requestType = (formData.get('requestType') as string) || 'refund';
    const imageFile = formData.get('image') as File;
    const refundMethod = formData.get('refundMethod') as string;
    const refundDetailsRaw = formData.get('refundDetails') as string;

    if (!orderId || !orderItemId || !reason || !imageFile || imageFile.size === 0) {
        return NextResponse.json({ error: 'Missing required fields or photo evidence' }, { status: 400 });
    }

    if (!ALLOWED_EVIDENCE_TYPES.has(imageFile.type)) {
        return NextResponse.json({ error: 'Photo evidence must be a JPG, PNG, or WebP image' }, { status: 400 });
    }

    if (imageFile.size > MAX_EVIDENCE_SIZE_BYTES) {
        return NextResponse.json({ error: 'Photo evidence must be 5MB or smaller' }, { status: 400 });
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existingReturn } = await adminSupabase
        .from('returns')
        .select('id')
        .eq('order_item_id', orderItemId)
        .single();

    if (existingReturn) {
        return NextResponse.json({ error: 'A return request already exists for this item' }, { status: 409 });
    }

    const { data: orderData, error: orderError } = await (adminSupabase
        .from('orders')
        .select('id, status, delivered_at')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single() as any);

    if (orderError || !orderData) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: orderItemData, error: orderItemError } = await (adminSupabase
        .from('order_items')
        .select('id, order_id')
        .eq('id', orderItemId)
        .eq('order_id', orderId)
        .single() as any);

    if (orderItemError || !orderItemData) {
        return NextResponse.json({ error: 'Order item not found for this order' }, { status: 404 });
    }

    if (!refundMethod) {
        return NextResponse.json({ error: 'Refund method is required' }, { status: 400 });
    }

    if (orderData.status !== 'delivered' || !orderData.delivered_at) {
        return NextResponse.json({ error: 'Order not delivered' }, { status: 400 });
    }

    if (!isReturnEligible(orderData.delivered_at)) {
        return NextResponse.json(
            { error: `The ${RETURN_WINDOW_DAYS}-day return window has expired for this order.` },
            { status: 400 }
        );
    }

    let imagePath: string | null = null;
    try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `evidence/${fileName}`;

        const { error: uploadError } = await adminSupabase.storage
            .from('returns')
            .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        imagePath = filePath;
    } catch (err) {
        console.error('Error uploading evidence:', err);
        return NextResponse.json({ error: 'Failed to upload photo evidence' }, { status: 500 });
    }

    let refundDetails: Record<string, unknown> | null = null;
    if (refundDetailsRaw) {
        try {
            refundDetails = JSON.parse(refundDetailsRaw);
        } catch {
            return NextResponse.json({ error: 'Refund details are invalid' }, { status: 400 });
        }
    }

    const { error } = await (adminSupabase.from('returns') as any).insert({
        user_id: user.id,
        order_id: orderId,
        order_item_id: orderItemId,
        request_type: requestType,
        reason: comments ? `${reason}: ${comments}` : reason,
        status: 'requested',
        image_path: imagePath,
        image_url: null,
        refund_method: refundMethod || 'original_source',
        refund_details: refundDetails,
    });

    if (error) {
        console.error('Error creating return:', error);
        return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        redirectUrl: `/account/orders/${orderId}/return/success`,
    });
}
