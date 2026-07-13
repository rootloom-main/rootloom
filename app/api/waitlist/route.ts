import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordOpsEvent } from '@/lib/ops-events';
import { getMarketingAttribution } from '@/lib/marketing-attribution';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
        const { success } = await checkRateLimit(ip);
        if (!success) {
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        const supabase = await createSSRClient();
        const adminSupabase = createAdminClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const body = await req.json();
        const productId = String(body.productId || '');
        const variantId = body.variantId ? String(body.variantId) : null;
        const email = body.email ? String(body.email).trim().toLowerCase() : null;
        const phone = body.phone ? String(body.phone).trim() : null;

        if (!productId || (!user && !email && !phone)) {
            return NextResponse.json({ success: false, message: 'Missing waitlist details' }, { status: 400 });
        }

        const attribution = await getMarketingAttribution();

        const { error } = await (adminSupabase.from('product_waitlist' as any).upsert({
            product_id: productId,
            variant_id: variantId,
            user_id: user?.id || null,
            email: email || user?.email || null,
            phone,
            source: 'product_page',
            metadata: {
                attribution,
            },
        } as any, {
            onConflict: user?.id ? 'product_id,variant_id,user_id' : (email ? 'product_id,variant_id,email' : 'product_id,variant_id,phone'),
            ignoreDuplicates: false,
        }) as any);

        if (error) {
            return NextResponse.json({ success: false, message: 'Could not join waitlist' }, { status: 500 });
        }

        await recordOpsEvent({
            eventType: 'growth.waitlist.signup',
            status: 'success',
            channel: phone ? 'whatsapp' : 'email',
            userId: user?.id || null,
            reference: productId,
            metadata: {
                variant_id: variantId,
                attribution,
            },
        });

        return NextResponse.json({ success: true, message: 'You are on the waitlist' });
    } catch (error: any) {
        console.error('[Waitlist] Failed to join waitlist', error);
        return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
    }
}
