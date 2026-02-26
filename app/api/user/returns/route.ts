import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const formData = await req.formData();

    const orderId = formData.get('orderId') as string;
    const orderItemId = formData.get('orderItemId') as string;
    const reason = formData.get('reason') as string;
    const comments = formData.get('comments') as string;

    // Validate Input
    if (!orderId || !orderItemId || !reason) {
        return NextResponse.redirect(`${req.nextUrl.origin}/account/orders/${orderId}/return?error=Missing required fields`, 303);
    }

    // 1. Verify User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(`${req.nextUrl.origin}/auth/login`, 303);
    }

    // 2. Insert Return Request
    const { error } = await (supabase
        .from('returns') as any)
        .insert({
            user_id: user.id,
            order_id: orderId,
            order_item_id: orderItemId,
            reason: comments ? `${reason}: ${comments}` : reason,
            status: 'requested',
        });

    if (error) {
        console.error('Error creating return:', error);
        return NextResponse.redirect(`${req.nextUrl.origin}/account/orders/${orderId}/return?error=Failed to submit request`, 303);
    }

    // Success - Redirect to order details with success message
    return NextResponse.redirect(`${req.nextUrl.origin}/account/orders/${orderId}?success=Return requested successfully`, 303);
}
