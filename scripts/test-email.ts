import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const resendApiKey = process.env.RESEND_API_KEY;

async function testEmail() {
    if (!resendApiKey) {
        console.error('RESEND_API_KEY is missing');
        return;
    }

    const resend = new Resend(resendApiKey);

    console.log('--- Test: environment fallback ---');
    try {
        const from = process.env.RESEND_FROM_ADDRESS || 'Root & Loom <orders@rootloom.in>';
        console.log(`Using from address: ${from}`);
        const { data, error } = await resend.emails.send({
            from: from,
            to: ['samirkasmani30@gmail.com'],
            subject: 'Diagnostic Test: Environment Fallback',
            html: '<p>This is a test of the environment fallback logic.</p>'
        });
        if (error) {
            console.error('Test Fail:', error);
        } else {
            console.log('Test Success:', data);
        }
    } catch (e) {
        console.error('Test Error:', e);
    }
}

testEmail();
