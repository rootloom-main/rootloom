import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('RESEND_API_KEY is missing');
            return NextResponse.json(
                { success: false, message: 'Server configuration error' },
                { status: 500 }
            );
        }

        const resend = new Resend(apiKey);

        const { name, email, subject, message } = await req.json();

        // Validate input
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { success: false, message: 'All fields are required' },
                { status: 400 }
            );
        }

        // Send email using Resend
        const { data, error } = await resend.emails.send({
            from: 'Root&Loom <noreply@rootloom.in>',
            to: ['root@rootloom.in'],
            replyTo: email,
            subject: `Contact Form: ${subject}`,
            html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
        });

        if (error) {
            console.error('Resend error:', error);
            return NextResponse.json(
                { success: false, message: 'Failed to send message' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Message sent successfully',
        });
    } catch (error: any) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Something went wrong' },
            { status: 500 }
        );
    }
}
