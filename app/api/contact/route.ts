import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { name, email, orderId, message } = await req.json();

        // Validate basic input
        if (!name || !email || !message) {
            return NextResponse.json(
                { success: false, message: 'Name, Email, and Message are required' },
                { status: 400 }
            );
        }

        // 1. Save to Database
        const supabase = await createClient();
        const { error: dbError } = await (supabase
            .from('contact_submissions') as any)
            .insert([
                {
                    name,
                    email,
                    order_id: orderId || null,
                    message,
                    status: 'unread'
                }
            ]);

        if (dbError) {
            console.error('Database error:', dbError);
            // We continue anyway to try and send the email, but we should log it
        }

        // 2. Send email using Resend (optional but recommended)
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey) {
            const resend = new Resend(apiKey);
            await resend.emails.send({
                from: 'Root&Loom Concierge <noreply@rootloom.in>',
                to: ['root@rootloom.in'],
                replyTo: email,
                subject: `New Concierge Inquiry from ${name}`,
                html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #E5E1DA; border-radius: 16px; background-color: #FFFFFF;">
    <h2 style="color: #1A231D; border-bottom: 2px solid #1A231D; padding-bottom: 12px; margin-bottom: 24px; font-weight: 500; letter-spacing: -0.01em;">New Concierge Inquiry</h2>
    
    <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 4px; font-size: 13px; color: #8F8F8F; text-transform: uppercase; letter-spacing: 0.05em;">Customer Details</p>
        <p style="margin: 0; font-size: 16px; color: #1A231D;"><strong>${name}</strong> (${email})</p>
    </div>

    ${orderId ? `
    <div style="margin-bottom: 20px;">
        <p style="margin: 0 0 4px; font-size: 13px; color: #8F8F8F; text-transform: uppercase; letter-spacing: 0.05em;">Related Order</p>
        <p style="margin: 0; font-size: 16px; color: #1A231D;">#${orderId}</p>
    </div>
    ` : ''}

    <div style="margin-top: 32px; padding: 24px; background: #F9F8F6; border-radius: 12px; border: 1px solid #E5E1DA;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #8F8F8F; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
        <p style="margin: 0; white-space: pre-wrap; color: #1A231D; line-height: 1.6;">${message}</p>
    </div>
    
    <div style="margin-top: 40px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/contacts" style="display: inline-block; padding: 14px 28px; background-color: #1A231D; color: #FFFFFF !important; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">View in Dashboard</a>
    </div>

    <p style="font-size: 11px; color: #A3A3A3; margin-top: 40px; text-align: center;">
        Root & Loom Concierge System | This inquiry has been logged in the admin database.
    </p>
</div>
                `,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Your message has been received by our concierge team.',
        });
    } catch (error: any) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Something went wrong' },
            { status: 500 }
        );
    }
}
