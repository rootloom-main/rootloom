import { after, NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import twilio from 'twilio';
import { recordOpsEvent } from '@/lib/ops-events';

const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

function extractSecretBytes(secret: string): Buffer {
    let clean = secret.trim();
    if (clean.startsWith('v1,')) clean = clean.slice(3);
    if (clean.startsWith('whsec_')) clean = clean.slice(6);
    return Buffer.from(clean, 'base64');
}

function verifySupabaseWebhookSignature(
    rawBody: string,
    headers: Headers,
    secret: string
): boolean {
    const msgId = headers.get('webhook-id') || headers.get('svix-id');
    const msgTimestamp = headers.get('webhook-timestamp') || headers.get('svix-timestamp');
    const signatureHeader = headers.get('webhook-signature') || headers.get('svix-signature');

    if (!msgId || !msgTimestamp || !signatureHeader) {
        return false;
    }

    // 5-minute timestamp tolerance to prevent replay attacks
    const timestampSec = parseInt(msgTimestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (isNaN(timestampSec) || Math.abs(nowSec - timestampSec) > WEBHOOK_TOLERANCE_SECONDS) {
        return false;
    }

    try {
        const secretBytes = extractSecretBytes(secret);
        const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
        const computedSignature = crypto
            .createHmac('sha256', secretBytes)
            .update(signedContent)
            .digest('base64');

        const expectedBuffer = Buffer.from(computedSignature, 'base64');

        // Header can contain space-separated signatures (e.g., "v1,<sig1> v1,<sig2>")
        const signatures = signatureHeader.split(' ');
        for (const versionedSig of signatures) {
            const parts = versionedSig.split(',');
            if (parts.length === 2 && parts[0] === 'v1') {
                const passedBuffer = Buffer.from(parts[1], 'base64');
                if (
                    passedBuffer.length === expectedBuffer.length &&
                    crypto.timingSafeEqual(passedBuffer, expectedBuffer)
                ) {
                    return true;
                }
            }
        }
        return false;
    } catch {
        return false;
    }
}

function maskPhone(p: string | undefined): string {
    if (!p) return 'none';
    const s = String(p).replace(/\D/g, '');
    return s.length >= 4 ? `+91******${s.slice(-4)}` : '******';
}

async function sendTwilioFallbackSms(
    formattedPhoneE164: string,
    otp: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken) {
        return { success: false, error: 'Twilio credentials not configured for fallback' };
    }

    try {
        const client = twilio(accountSid, authToken);
        const messageOptions: any = {
            body: `Your Root & Loom verification code is ${otp}. Valid for 10 minutes. Please do not share this code with anyone.`,
            to: formattedPhoneE164,
        };

        if (fromNumber) {
            messageOptions.from = fromNumber;
        }

        const message = await client.messages.create(messageOptions);
        return { success: true, messageId: message.sid };
    } catch (err: any) {
        console.error('[SMS Provider] Twilio fallback error:', err);
        return { success: false, error: err.message || 'Twilio send failed' };
    }
}

async function dispatchSmsOtp(
    formattedPhoneE164: string,
    msg91Mobile: string,
    otpString: string
) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const flowId = process.env.MSG91_FLOW_ID || process.env.MSG91_TEMPLATE_ID || '6a8ae88de4600371d60f7913';
    const senderId = process.env.MSG91_SENDER_ID || 'SHRMFL';
    const otpVariableName = process.env.MSG91_OTP_VAR_NAME || 'OTP';

    let msg91Error: string | null = null;

    if (authKey && flowId) {
        console.log(`[SMS Provider] Delivering Supabase OTP to ${maskPhone(formattedPhoneE164)} via MSG91 (Flow: ${flowId}, Sender: ${senderId})...`);

        try {
            const msg91Payload = {
                flow_id: flowId,
                short_url: '0',
                sender: senderId,
                recipients: [
                    {
                        mobiles: msg91Mobile,
                        [otpVariableName]: otpString,
                        OTP: otpString,
                        var: otpString,
                        otp: otpString,
                    },
                ],
            };

            const response = await fetch('https://api.msg91.com/api/v5/flow/', {
                method: 'POST',
                headers: {
                    'authkey': authKey,
                    'content-type': 'application/json',
                    'accept': 'application/json',
                },
                body: JSON.stringify(msg91Payload),
            });

            const responseData = await response.json().catch(() => ({}));
            const providerMessage = responseData.message || responseData.error || responseData.request_id || 'No response message';
            const isMsg91Success = response.ok && responseData.type === 'success';

            if (isMsg91Success) {
                const messageId = responseData.request_id || responseData.message || 'msg91_sent';

                await recordOpsEvent({
                    eventType: 'auth.sms_otp',
                    status: 'success',
                    channel: 'sms',
                    reference: formattedPhoneE164,
                    metadata: {
                        provider: 'msg91',
                        messageId,
                        flowId,
                        senderId,
                        otpVariableName,
                    },
                });

                console.log(`[SMS Provider Hook] MSG91 Delivery Success (ID: ${messageId}).`);
                return;
            }

            msg91Error = `MSG91 HTTP ${response.status}: ${providerMessage}`;
            console.error('[SMS Provider] MSG91 API error:', msg91Error, {
                responseType: responseData.type || 'unknown',
            });
        } catch (err: any) {
            msg91Error = err.message || String(err);
            console.error('[SMS Provider] Exception sending MSG91 SMS:', msg91Error);
        }
    } else {
        msg91Error = !authKey ? 'MSG91_AUTH_KEY is not configured' : 'MSG91_FLOW_ID/MSG91_TEMPLATE_ID is not configured';
        console.warn(`[SMS Provider] ${msg91Error}, attempting fallback...`);
    }

    console.log(`[SMS Provider] Attempting Twilio SMS fallback for ${maskPhone(formattedPhoneE164)}...`);
    const twilioResult = await sendTwilioFallbackSms(formattedPhoneE164, otpString);

    if (twilioResult.success) {
        await recordOpsEvent({
            eventType: 'auth.sms_otp',
            status: 'success',
            channel: 'sms',
            reference: formattedPhoneE164,
            metadata: {
                provider: 'twilio_fallback',
                messageId: twilioResult.messageId,
                primaryProviderError: msg91Error,
            },
        });

        console.log(`[SMS Provider Hook] Twilio Fallback Success (ID: ${twilioResult.messageId}).`);
        return;
    }

    await recordOpsEvent({
        eventType: 'auth.sms_otp',
        status: 'failed',
        channel: 'sms',
        reference: formattedPhoneE164,
        metadata: {
            primaryError: msg91Error,
            fallbackError: twilioResult.error,
        },
    });
}

function scheduleSmsDispatch(
    formattedPhoneE164: string,
    msg91Mobile: string,
    otpString: string
) {
    try {
        after(() => dispatchSmsOtp(formattedPhoneE164, msg91Mobile, otpString));
    } catch {
        void dispatchSmsOtp(formattedPhoneE164, msg91Mobile, otpString);
    }
}

export async function POST(request: NextRequest) {
    const timestamp = new Date().toISOString();
    const headers = request.headers;
    const hasWebhookId = Boolean(headers.get('webhook-id') || headers.get('svix-id'));
    const hasWebhookTimestamp = Boolean(headers.get('webhook-timestamp') || headers.get('svix-timestamp'));
    const hasWebhookSignature = Boolean(headers.get('webhook-signature') || headers.get('svix-signature'));
    const hasAuthHeader = Boolean(headers.get('authorization'));
    const contentType = headers.get('content-type') || 'unknown';

    try {
        const rawBody = await request.text();
        const bodyLength = rawBody.length;
        const expectedSecret = process.env.SUPABASE_SMS_HOOK_SECRET;

        console.log(`[SMS Provider Hook] [${timestamp}] Incoming Request:`, {
            method: request.method,
            url: request.nextUrl.pathname,
            hasWebhookId,
            hasWebhookTimestamp,
            hasWebhookSignature,
            hasAuthHeader,
            contentType,
            bodyLength,
            hasSecretConfigured: Boolean(expectedSecret),
        });

        if (!expectedSecret) {
            console.error('[SMS Provider] Error: SUPABASE_SMS_HOOK_SECRET is not configured in process.env. Returning 500.');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        // 1. Verify Standard Webhooks signature (Supabase HTTP Hook Authentication)
        const isValid = verifySupabaseWebhookSignature(rawBody, request.headers, expectedSecret);
        if (!isValid) {
            console.warn(`[SMS Provider] Signature verification failed. Returning 401.`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse request payload from Supabase Auth SMS Hook
        let body: any;
        try {
            body = JSON.parse(rawBody);
        } catch {
            console.warn(`[SMS Provider] JSON parse failed on body. Returning 400.`);
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const phone = body.phone || body.sms?.phone || body.user?.phone || body.recipient;
        const rawMessage = body.message || body.sms?.message || '';
        const otp = body.otp || body.sms?.otp || rawMessage.match(/\b\d{6}\b/)?.[0];

        console.log(`[SMS Provider Hook] Payload Verified:`, {
            phoneMasked: maskPhone(phone),
            hasOtp: Boolean(otp),
            hasMessage: Boolean(rawMessage),
        });

        if (!phone || !otp) {
            console.warn(`[SMS Provider] Missing phone or OTP in payload. Returning 400.`);
            return NextResponse.json({ error: 'Missing phone number or OTP code' }, { status: 400 });
        }

        // 3. Format phone number: clean digits and ensure country code without leading '+' for MSG91
        const cleanDigits = String(phone).replace(/\D/g, '');
        let msg91Mobile = cleanDigits;
        if (cleanDigits.length === 10) {
            msg91Mobile = `91${cleanDigits}`;
        } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
            msg91Mobile = cleanDigits;
        }

        const formattedPhoneE164 = `+${msg91Mobile}`;
        const otpString = String(otp).trim();

        scheduleSmsDispatch(formattedPhoneE164, msg91Mobile, otpString);
        console.log(`[SMS Provider Hook] Accepted SMS hook for ${maskPhone(formattedPhoneE164)}. Returning 200 before provider dispatch to avoid Supabase timeout.`);
        return NextResponse.json({ success: true, provider: 'msg91_queued' });
    } catch (error: any) {
        console.error('[SMS Provider] Unhandled error processing SMS delivery:', error);

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
