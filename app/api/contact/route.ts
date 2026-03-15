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
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #1A231D; border-bottom: 2px solid #1A231D; padding-bottom: 10px;">New Concierge Inquiry</h2>
                        <p><strong>From:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ''}
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
                            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
                        </div>
                        <p style="font-size: 12px; color: #888; margin-top: 30px;">
                            This message has been saved to the admin dashboard.
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
