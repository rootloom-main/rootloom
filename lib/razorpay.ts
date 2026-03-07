// lib/razorpay.ts

import https from 'https';
import dns from 'dns';

export async function processRazorpayRefund({
    paymentId,
    amount, // amount in main currency (e.g. INR 100)
}: {
    paymentId: string;
    amount?: number;
}) {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('Razorpay keys not configured');
    }

    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const bodyString = amount ? JSON.stringify({ amount: Math.round(amount * 100) }) : '';

    // DNS Resilience: Manually resolve api.razorpay.com if system DNS fails (ENOTFOUND)
    const resolveHostname = async (hostname: string) => {
        try {
            const resolver = new dns.promises.Resolver();
            resolver.setServers(['8.8.8.8', '1.1.1.1']);
            const addresses = await resolver.resolve4(hostname);
            return addresses[0];
        } catch (e) {
            console.error('DNS Resolution Fallback failed:', e);
            return hostname;
        }
    };

    const targetIp = await resolveHostname('api.razorpay.com');

    return new Promise<any>((resolve, reject) => {
        const options = {
            hostname: targetIp,
            port: 443,
            path: `/v1/payments/${paymentId}/refund`,
            method: 'POST',
            headers: {
                'Host': 'api.razorpay.com', // Critical when using IP
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                ...(bodyString ? { 'Content-Length': Buffer.byteLength(bodyString) } : {})
            },
            family: 4 // Force IPv4 routing to bypass local 'fetch failed' IPv6 DNS drops
        };

        const request = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            success: true,
                            refundId: data.id,
                            status: data.status,
                            amount: data.amount / 100,
                        });
                    } else {
                        const errMsg = data?.error?.description || data?.error?.reason || 'Failed to process refund with Razorpay';
                        reject(new Error(errMsg));
                    }
                } catch (e) {
                    reject(new Error('Razorpay response parse failed'));
                }
            });
        });

        request.on('error', (e) => reject(new Error(`Network error processing refund: ${e.message}`)));
        if (bodyString) request.write(bodyString);
        request.end();
    });
}
