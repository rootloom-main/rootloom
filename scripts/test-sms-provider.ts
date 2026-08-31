/**
 * Unit & Integration Tests for DLT-Compliant SMS Provider Hook (MSG91 + Twilio Fallback)
 * 
 * Run with: npx tsx scripts/test-sms-provider.ts
 */

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
    if (id === 'server-only') return {};
    return originalRequire.apply(this, arguments);
};

try {
    const serverOnlyPath = require.resolve('server-only');
    require.cache[serverOnlyPath] = {
        id: serverOnlyPath,
        filename: serverOnlyPath,
        loaded: true,
        exports: {},
    } as any;
} catch (e) {}

import { NextRequest } from 'next/server';
import crypto from 'crypto';

function generateSvixSignature(msgId: string, timestamp: number, body: string, secret: string): string {
    let clean = secret.trim();
    if (clean.startsWith('v1,')) clean = clean.slice(3);
    if (clean.startsWith('whsec_')) clean = clean.slice(6);
    const secretBytes = Buffer.from(clean, 'base64');
    const signedContent = `${msgId}.${timestamp}.${body}`;
    const sig = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
    return `v1,${sig}`;
}

async function runTests() {
    console.log('================================================================');
    console.log('🧪 Starting SMS Provider Hook & Fallback Test Suite');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, desc: string, details?: string) {
        if (condition) {
            console.log(`  ✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${desc}`);
            if (details) console.error(`     Details: ${details}`);
            failed++;
        }
    }

    const originalFetch = global.fetch;
    const testSecret = 'v1,whsec_Mf5vX7k2Z3bY4w8Q9e1R6t0U+A/B=';

    process.env.SUPABASE_SMS_HOOK_SECRET = testSecret;
    process.env.MSG91_AUTH_KEY = 'test_msg91_authkey_mock';
    process.env.MSG91_FLOW_ID = '6a8ae88de4600371d60f7913';
    process.env.MSG91_OTP_VAR_NAME = 'var';
    delete process.env.MSG91_TEMPLATE_ID;
    process.env.MSG91_DLT_TEMPLATE_ID = '1007453585041828015';
    process.env.MSG91_SENDER_ID = 'SHRMFL';
    process.env.TWILIO_ACCOUNT_SID = 'AC_test_account_sid_mock';
    process.env.TWILIO_AUTH_TOKEN = 'test_auth_token_mock';
    process.env.TWILIO_PHONE_NUMBER = '+15551234567';

    const { POST } = await import('../app/api/auth/sms-provider/route');

    // -------------------------------------------------------------
    // Test 1: Rejects missing webhook signature headers (401)
    // -------------------------------------------------------------
    console.log('\n--- 1. Cryptographic Signature & Security Tests ---');
    {
        const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
            method: 'POST',
            headers: {},
            body: JSON.stringify({ phone: '+919876543210', otp: '123456' }),
        });
        const res = await POST(req);
        assert(res.status === 401, 'Rejects request without webhook signature headers with 401');
    }

    // -------------------------------------------------------------
    // Test 2: Rejects invalid signature (401)
    // -------------------------------------------------------------
    {
        const msgId = 'msg_test_001';
        const timestamp = Math.floor(Date.now() / 1000);
        const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
            method: 'POST',
            headers: {
                'webhook-id': msgId,
                'webhook-timestamp': String(timestamp),
                'webhook-signature': 'v1,invalid_signature_base64==',
            },
            body: JSON.stringify({ phone: '+919876543210', otp: '123456' }),
        });
        const res = await POST(req);
        assert(res.status === 401, 'Rejects request with forged/invalid signature with 401');
    }

    // -------------------------------------------------------------
    // Test 3: Replay attack protection (> 5 minutes old timestamp) (401)
    // -------------------------------------------------------------
    {
        const msgId = 'msg_test_002';
        const expiredTimestamp = Math.floor(Date.now() / 1000) - 400; // 400s ago
        const bodyStr = JSON.stringify({ phone: '+919876543210', otp: '123456' });
        const signature = generateSvixSignature(msgId, expiredTimestamp, bodyStr, testSecret);

        const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
            method: 'POST',
            headers: {
                'webhook-id': msgId,
                'webhook-timestamp': String(expiredTimestamp),
                'webhook-signature': signature,
            },
            body: bodyStr,
        });
        const res = await POST(req);
        assert(res.status === 401, 'Rejects expired timestamp (>5 min drift) to prevent replay attacks');
    }

    // -------------------------------------------------------------
    // Test 4: Missing payload fields (400)
    // -------------------------------------------------------------
    console.log('\n--- 2. Payload Validation Tests ---');
    {
        const msgId = 'msg_test_003';
        const timestamp = Math.floor(Date.now() / 1000);
        const bodyStr = JSON.stringify({ message: 'Hello without phone or otp' });
        const signature = generateSvixSignature(msgId, timestamp, bodyStr, testSecret);

        const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
            method: 'POST',
            headers: {
                'webhook-id': msgId,
                'webhook-timestamp': String(timestamp),
                'webhook-signature': signature,
            },
            body: bodyStr,
        });
        const res = await POST(req);
        assert(res.status === 400, 'Returns 400 when phone number or OTP is missing in payload');
    }

    // -------------------------------------------------------------
    // Test 5: Successful Delivery via MSG91 Flow API
    // -------------------------------------------------------------
    console.log('\n--- 3. Primary Provider (MSG91 Flow) Delivery Tests ---');
    {
        let capturedFetchUrl = '';
        let capturedFetchOptions: any = null;

        global.fetch = async (url: any, options: any) => {
            capturedFetchUrl = String(url);
            capturedFetchOptions = options;
            return {
                ok: true,
                status: 200,
                json: async () => ({ type: 'success', message: 'SMS sent successfully', request_id: 'msg91_req_789456' }),
            } as any;
        };

        const msgId = 'msg_test_004';
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = {
            user: { phone: '+919876543210' },
            sms: { otp: '654321' },
        };
        const bodyStr = JSON.stringify(payload);
        const signature = generateSvixSignature(msgId, timestamp, bodyStr, testSecret);

        const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
            method: 'POST',
            headers: {
                'webhook-id': msgId,
                'webhook-timestamp': String(timestamp),
                'webhook-signature': signature,
            },
            body: bodyStr,
        });

        const res = await POST(req);
        const resData = await res.json();

        assert(res.status === 200, 'Returns 200 on successful MSG91 delivery');
        assert(resData.success === true, 'Response contains success: true');
        assert(resData.provider === 'msg91_queued', 'Response indicates MSG91 dispatch was queued');
        assert(capturedFetchUrl === 'https://api.msg91.com/api/v5/flow/', 'Dispatches to MSG91 Flow API endpoint');

        const parsedBody = JSON.parse(capturedFetchOptions?.body || '{}');
        assert(parsedBody.flow_id === process.env.MSG91_FLOW_ID, 'Uses correct MSG91 Flow ID');
        assert(parsedBody.sender === 'SHRMFL', 'Uses correct DLT Sender ID');
        assert(parsedBody.recipients?.[0]?.mobiles === '919876543210', 'Correctly formats recipient phone to 91XXXXXXXXXX');
        assert(parsedBody.recipients?.[0]?.OTP === '654321', 'Maps variable OTP correctly');
        assert(parsedBody.recipients?.[0]?.var === '654321', 'Maps variable var correctly');
    }

    // -------------------------------------------------------------
    // Test 6: Automatic Twilio Fallback when MSG91 Fails
    // -------------------------------------------------------------
    console.log('\n--- 4. Failover & Fallback Delivery Tests ---');
    {
        // Simulate MSG91 failure
        global.fetch = async () => {
            return {
                ok: false,
                status: 500,
                json: async () => ({ type: 'error', message: 'MSG91 Service Unavailable' }),
            } as any;
        };

        const msgId = 'msg_test_005';
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = {
            phone: '9876543210',
            otp: '456789',
        };
        const bodyStr = JSON.stringify(payload);
        const signature = generateSvixSignature(msgId, timestamp, bodyStr, testSecret);

        const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
            method: 'POST',
            headers: {
                'webhook-id': msgId,
                'webhook-timestamp': String(timestamp),
                'webhook-signature': signature,
            },
            body: bodyStr,
        });

        const res = await POST(req);
        const resData = await res.json();

        assert(res.status === 200, 'Returns 200 before background provider dispatch');
        assert(resData.success === true, 'Response contains success: true');
        assert(resData.provider === 'msg91_queued', 'Response indicates SMS dispatch was queued');
    }

    // Restore fetch
    global.fetch = originalFetch;

    console.log('\n================================================================');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
});
