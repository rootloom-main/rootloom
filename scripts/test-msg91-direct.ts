import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function maskPhone(p: string): string {
    const clean = p.replace(/\D/g, '');
    return clean.length >= 4 ? `+91******${clean.slice(-4)}` : '******';
}

async function testMsg91Direct() {
    const rawTarget = process.argv[2];
    if (!rawTarget) {
        console.log('Usage: npx tsx scripts/test-msg91-direct.ts <10-digit-or-+91-phone-number> [flow_id]');
        process.exit(1);
    }

    const cleanDigits = rawTarget.replace(/\D/g, '');
    let msg91Mobile = cleanDigits;
    if (cleanDigits.length === 10) {
        msg91Mobile = `91${cleanDigits}`;
    } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
        msg91Mobile = cleanDigits;
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    const flowId = process.argv[3] || process.env.MSG91_FLOW_ID || process.env.MSG91_TEMPLATE_ID || '6a8ae88de4600371d60f7913';
    const senderId = process.env.MSG91_SENDER_ID || 'SHRMFL';
    const otpVariableName = process.env.MSG91_OTP_VAR_NAME || 'OTP';

    console.log('=== MSG91 Direct Diagnostic Test ===');
    console.log('Target Phone:', maskPhone(msg91Mobile));
    console.log('MSG91_AUTH_KEY present:', Boolean(authKey));
    console.log('Flow ID:', flowId);
    console.log('Sender ID:', senderId);
    console.log('OTP Variable Name:', otpVariableName);

    if (!authKey) {
        console.error('❌ ERROR: MSG91_AUTH_KEY is not configured in .env.local');
        process.exit(1);
    }

    const dummyOtp = '839102'; // Diagnostic mock variable

    const msg91Payload = {
        flow_id: flowId,
        short_url: '0',
        sender: senderId,
        recipients: [
            {
                mobiles: msg91Mobile,
                [otpVariableName]: dummyOtp,
                OTP: dummyOtp,
                otp: dummyOtp,
                var: dummyOtp,
            },
        ],
    };

    try {
        console.log('Endpoint:', 'https://api.msg91.com/api/v5/flow/');
        console.log('Payload:', JSON.stringify(msg91Payload, null, 2));

        const response = await fetch('https://api.msg91.com/api/v5/flow/', {
            method: 'POST',
            headers: {
                'authkey': authKey,
                'content-type': 'application/json',
                'accept': 'application/json',
            },
            body: JSON.stringify(msg91Payload),
        });

        console.log('HTTP Status:', response.status);
        const data = await response.json().catch(() => ({}));
        console.log('Raw Response:', JSON.stringify(data, null, 2));
        console.log('Response Type:', data.type || 'unknown');
        console.log('Request ID / Message ID:', data.request_id || data.message || 'none');
        if (data.type !== 'success' || !response.ok) {
            console.log('Provider Error Message:', data.message || data.error || 'unknown');
        } else {
            console.log('✅ MSG91 accepted the SMS dispatch request.');
        }
    } catch (err: any) {
        console.error('❌ Network exception contacting MSG91:', err.message);
    }
}

testMsg91Direct();
