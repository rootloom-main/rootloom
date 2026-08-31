/**
 * Unit/Integration test for MSG91 SMS Provider Route with Supabase Standard Webhooks Verification
 */
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
    if (id === 'server-only') return {};
    return originalRequire.apply(this, arguments);
};

// Also mock require.cache
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
    const { POST } = await import('../app/api/auth/sms-provider/route');
    console.log('=== Starting MSG91 SMS Provider Standard Webhooks Verification ===\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, desc: string) {
        if (condition) {
            console.log(`✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${desc}`);
            failed++;
        }
    }

    const originalFetch = global.fetch;
    const originalEnv = { ...process.env };

    try {
        const testSecret = 'v1,whsec_Mf5vX7k2Z3bY4w8Q9e1R6t0U+A/B=';
        process.env.MSG91_AUTH_KEY = 'test_auth_key_12345';
        process.env.MSG91_FLOW_ID = '6a8ae88de4600371d60f7913';
        process.env.MSG91_OTP_VAR_NAME = 'VAR1';
        delete process.env.MSG91_TEMPLATE_ID;
        process.env.MSG91_DLT_TEMPLATE_ID = '1007453585041828015';
        process.env.MSG91_SENDER_ID = 'SHRMFL';
        process.env.SUPABASE_SMS_HOOK_SECRET = testSecret;

        // -------------------------------------------------------------
        // Test 1: Rejects missing webhook signature headers (401)
        // -------------------------------------------------------------
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
            assert(res.status === 401, 'Rejects request with invalid webhook signature with 401');
        }

        // -------------------------------------------------------------
        // Test 3: Rejects expired timestamp (> 5 minutes old) (401)
        // -------------------------------------------------------------
        {
            const msgId = 'msg_test_002';
            const expiredTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
            const bodyStr = JSON.stringify({ phone: '+919876543210', otp: '123456' });
            const validSigForOldTime = generateSvixSignature(msgId, expiredTimestamp, bodyStr, testSecret);

            const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
                method: 'POST',
                headers: {
                    'webhook-id': msgId,
                    'webhook-timestamp': String(expiredTimestamp),
                    'webhook-signature': validSigForOldTime,
                },
                body: bodyStr,
            });
            const res = await POST(req);
            assert(res.status === 401, 'Rejects request with expired timestamp (> 5 min) with 401');
        }

        // -------------------------------------------------------------
        // Test 4: Rejects tampered body with valid timestamp/ID (401)
        // -------------------------------------------------------------
        {
            const msgId = 'msg_test_003';
            const timestamp = Math.floor(Date.now() / 1000);
            const originalBodyStr = JSON.stringify({ phone: '+919876543210', otp: '123456' });
            const sig = generateSvixSignature(msgId, timestamp, originalBodyStr, testSecret);

            const tamperedBodyStr = JSON.stringify({ phone: '+919876543210', otp: '999999' }); // tampered OTP
            const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
                method: 'POST',
                headers: {
                    'webhook-id': msgId,
                    'webhook-timestamp': String(timestamp),
                    'webhook-signature': sig,
                },
                body: tamperedBodyStr,
            });
            const res = await POST(req);
            assert(res.status === 401, 'Rejects request when body is tampered with 401');
        }

        // -------------------------------------------------------------
        // Test 5: Rejects missing phone or OTP with valid signature (400)
        // -------------------------------------------------------------
        {
            const msgId = 'msg_test_004';
            const timestamp = Math.floor(Date.now() / 1000);
            const bodyStr = JSON.stringify({ phone: '+919876543210' }); // missing OTP
            const sig = generateSvixSignature(msgId, timestamp, bodyStr, testSecret);

            const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
                method: 'POST',
                headers: {
                    'webhook-id': msgId,
                    'webhook-timestamp': String(timestamp),
                    'webhook-signature': sig,
                },
                body: bodyStr,
            });
            const res = await POST(req);
            assert(res.status === 400, 'Rejects signed request with missing OTP with 400');
        }

        // -------------------------------------------------------------
        // Test 6: Valid Standard Webhook signature & MSG91 Flow dispatch (200)
        // -------------------------------------------------------------
        {
            let capturedUrl = '';
            let capturedHeaders: Record<string, string> = {};
            let capturedBody: any = null;

            global.fetch = (async (url: string, init: any) => {
                capturedUrl = url;
                capturedHeaders = init?.headers || {};
                capturedBody = JSON.parse(init?.body || '{}');
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        type: 'success',
                        message: '316361673836373832363731',
                        request_id: 'req_msg91_live_001',
                    }),
                } as any;
            }) as any;

            const msgId = 'msg_test_valid_005';
            const timestamp = Math.floor(Date.now() / 1000);
            const bodyStr = JSON.stringify({
                user: { phone: '+919876543210' },
                sms: {
                    otp: '849201',
                    message: 'Your verification OTP is 849201',
                },
            });
            const sig = generateSvixSignature(msgId, timestamp, bodyStr, testSecret);

            const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
                method: 'POST',
                headers: {
                    'svix-id': msgId,
                    'svix-timestamp': String(timestamp),
                    'svix-signature': sig,
                },
                body: bodyStr,
            });

            const res = await POST(req);
            const data = await res.json();

            assert(res.status === 200, 'Returns 200 OK on verified Supabase webhook');
            assert(data.success === true, 'Response indicates success: true');
            assert(data.provider === 'msg91_queued', 'Returns queued provider response before background dispatch');
            assert(data.otp === undefined, 'Does NOT expose OTP in response body');
            assert(data.authKey === undefined, 'Does NOT expose MSG91 Auth Key in response body');

            // Verify MSG91 API Request structure
            assert(capturedUrl === 'https://api.msg91.com/api/v5/flow/', 'Calls MSG91 Flow API v5 endpoint');
            assert(capturedHeaders['authkey'] === 'test_auth_key_12345', 'Sends MSG91 authkey in request headers');
            assert(capturedHeaders['content-type'] === 'application/json', 'Sets Content-Type application/json');
            assert(capturedBody.flow_id === '6a8ae88de4600371d60f7913', 'Uses exact MSG91 Flow ID 6a8ae88de4600371d60f7913');
            assert(capturedBody.sender === 'SHRMFL', 'Uses exact Sender ID SHRMFL');
            assert(capturedBody.recipients?.[0]?.mobiles === '919876543210', 'Correctly formats mobile to 91XXXXXXXXXX');
            assert(capturedBody.recipients?.[0]?.VAR1 === '849201', 'Sends OTP using configured MSG91 variable name');
            assert(capturedBody.recipients?.[0]?.OTP === '849201', 'Sends EXACT Supabase OTP in the "OTP" parameter');
        }

        // -------------------------------------------------------------
        // Test 7: Space-separated signatures in header (Rotation support)
        // -------------------------------------------------------------
        {
            const msgId = 'msg_test_006';
            const timestamp = Math.floor(Date.now() / 1000);
            const bodyStr = JSON.stringify({ phone: '+919876543210', otp: '334455' });
            const validSig = generateSvixSignature(msgId, timestamp, bodyStr, testSecret);
            const multipleSigs = `v1,old_invalid_sig== ${validSig}`;

            const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
                method: 'POST',
                headers: {
                    'webhook-id': msgId,
                    'webhook-timestamp': String(timestamp),
                    'webhook-signature': multipleSigs,
                },
                body: bodyStr,
            });

            const res = await POST(req);
            assert(res.status === 200, 'Accepts valid signature when multiple space-separated signatures are provided');
        }

        // -------------------------------------------------------------
        // Test 8: MSG91 Provider Error handling
        // -------------------------------------------------------------
        {
            global.fetch = (async () => {
                return {
                    ok: false,
                    status: 400,
                    json: async () => ({ type: 'error', message: 'Template not found' }),
                } as any;
            }) as any;

            const msgId = 'msg_test_007';
            const timestamp = Math.floor(Date.now() / 1000);
            const bodyStr = JSON.stringify({ phone: '+919876543210', otp: '112233' });
            const sig = generateSvixSignature(msgId, timestamp, bodyStr, testSecret);

            const req = new NextRequest('http://localhost:3000/api/auth/sms-provider', {
                method: 'POST',
                headers: {
                    'webhook-id': msgId,
                    'webhook-timestamp': String(timestamp),
                    'webhook-signature': sig,
                },
                body: bodyStr,
            });

            const res = await POST(req);
            const data = await res.json();
            assert(res.status === 200, 'Returns 200 OK before background provider dispatch');
            assert(
                data.success === true && data.provider === 'msg91_queued',
                'Returns queued response without exposing provider failure details synchronously'
            );
        }

    } finally {
        global.fetch = originalFetch;
        process.env = originalEnv;
    }

    console.log(`\n=== Webhook Verification Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
