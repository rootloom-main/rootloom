import { sendWhatsAppMessage } from '../lib/whatsapp';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    console.log('Testing Twilio Setup...');
    console.log('SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('Auth:', process.env.TWILIO_AUTH_TOKEN ? '***' : 'Missing');

    // Replace with the user's opted-in number for testing
    const testNumber = '+919876543210';

    const success = await sendWhatsAppMessage(
        testNumber,
        'This is a test message from the Rootloom local environment.'
    );

    console.log('Result:', success ? 'Passed' : 'Failed');
}

test();
