import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { recordOpsEvent } from '@/lib/ops-events';

export async function POST(request: NextRequest) {
    try {
        // 1. Verify Authentication Header if configured
        const authHeader = request.headers.get('authorization');
        const expectedSecret = process.env.SUPABASE_SMS_HOOK_SECRET;
        if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request payload
        const body = await request.json();
        const phone = body.phone || body.sms?.phone;
        const rawMessage = body.message || body.sms?.message || '';
        const otp = body.otp || body.sms?.otp || rawMessage.match(/\b\d{6}\b/)?.[0];

        if (!phone || !otp) {
            return NextResponse.json({ error: 'Missing phone number or OTP code' }, { status: 400 });
        }

        // 3. Format phone number to E.164
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) {
            if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
                formattedPhone = `+${formattedPhone}`;
            } else if (formattedPhone.length === 10) {
                formattedPhone = `+91${formattedPhone}`;
            } else {
                formattedPhone = `+${formattedPhone}`;
            }
        }

        // 4. Retrieve Twilio credentials
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        const dltEntityId = process.env.TWILIO_DLT_ENTITY_ID;
        const dltTemplateId = process.env.TWILIO_DLT_TEMPLATE_ID;

        if (!accountSid || !authToken || !messagingServiceSid) {
            console.error('Twilio credentials or Messaging Service SID missing.');
            return NextResponse.json({ error: 'SMS service configuration error' }, { status: 500 });
        }

        // 5. Build DLT-compliant message body
        const dltTemplate = process.env.TWILIO_DLT_TEMPLATE || '{otp} is your verification OTP for Root & Loom. This is valid for 10 minutes. - RTLM';
        const finalMessageBody = dltTemplate.replace('{otp}', otp);

        console.log(`[SMS Provider] Sending OTP to ${formattedPhone}...`);

        // 6. Initialize Twilio client and send message
        const client = twilio(accountSid, authToken);
        
        const messagePayload: any = {
            body: finalMessageBody,
            from: messagingServiceSid,
            to: formattedPhone,
        };

        // Inject DLT parameters if configured (required for India transactional SMS)
        if (dltEntityId) {
            messagePayload.dltEntityId = dltEntityId;
        }
        if (dltTemplateId) {
            messagePayload.dltTemplateId = dltTemplateId;
        }

        const result = await client.messages.create(messagePayload);

        await recordOpsEvent({
            eventType: 'auth.sms_otp',
            status: 'success',
            channel: 'sms',
            reference: formattedPhone,
            metadata: { sid: result.sid },
        });

        return NextResponse.json({ success: true, messageId: result.sid });
    } catch (error: any) {
        console.error('[SMS Provider] Error sending SMS:', error);
        
        await recordOpsEvent({
            eventType: 'auth.sms_otp',
            status: 'failed',
            channel: 'sms',
            reference: 'unknown',
            metadata: { error: error.message || String(error) },
        });

        return NextResponse.json({ error: error.message || 'Failed to send SMS' }, { status: 500 });
    }
}
