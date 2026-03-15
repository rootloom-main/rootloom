import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';

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

    // Validate Input
    if (!orderId || !orderItemId || !reason || !imageFile || imageFile.size === 0) {
        return NextResponse.json({ error: 'Missing required fields or photo evidence' }, { status: 400 });
    }

    // 1. Verify User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1.2 Idempotency: Check for existing return
    const { data: existingReturn } = await adminSupabase
        .from('returns')
        .select('id')
        .eq('order_item_id', orderItemId)
        .single();

    if (existingReturn) {
        return NextResponse.json({ error: 'A return request already exists for this item' }, { status: 409 });
    }

    // 1.5 Fraud Protection & Eligibility Check
    console.log('[DEBUG] Checking order eligibility:', { orderId, userId: user.id });
    const { data: orderData, error: orderError } = (await adminSupabase
        .from('orders')
        .select('status, delivered_at')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single()) as any;

    if (orderError || !orderData) {
        console.error('[DEBUG] Order check failed:', { orderError, orderData });
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If the client passed bank/UPI details, we just store them.
    // If we wanted to enforce COD strictly, we'd need a payment_method column or check payment_status.
    if (!refundMethod) {
        return NextResponse.json({ error: 'Refund method is required' }, { status: 400 });
    }

    if (orderData.status !== 'delivered' || !orderData.delivered_at) {
        return NextResponse.json({ error: 'Order not delivered' }, { status: 400 });
    }

    // Check if within 7 days
    const deliveryDate = new Date(orderData.delivered_at);
    const currentDate = new Date();
    const daysSinceDelivery = (currentDate.getTime() - deliveryDate.getTime()) / (1000 * 3600 * 24);

    if (daysSinceDelivery > 7) {
        return NextResponse.json({ error: 'The 7-day return window has expired for this order.' }, { status: 400 });
    }

    // 2. Upload Image
    let imageUrl = null;
    try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `evidence/${fileName}`;

        const { error: uploadError } = await adminSupabase.storage
            .from('returns')
            .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = adminSupabase.storage
            .from('returns')
            .getPublicUrl(filePath);

        imageUrl = publicUrl;
    } catch (err) {
        console.error('Error uploading evidence:', err);
        return NextResponse.json({ error: 'Failed to upload photo evidence' }, { status: 500 });
    }

    const { error } = await (adminSupabase
        .from('returns') as any)
        .insert({
            user_id: user.id,
            order_id: orderId,
            order_item_id: orderItemId,
            request_type: requestType,
            reason: comments ? `${reason}: ${comments}` : reason,
            status: 'requested',
            image_url: imageUrl,
            refund_method: refundMethod || 'original_source',
            refund_details: refundDetailsRaw ? JSON.parse(refundDetailsRaw) : null,
        });

    if (error) {
        console.error('Error creating return:', error);
        return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    // Success - Return JSON for AJAX handler
    return NextResponse.json({
        success: true,
        redirectUrl: `/account/orders/${orderId}/return/success`
    });
}
