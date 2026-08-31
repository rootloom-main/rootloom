import dotenv from 'dotenv';
import path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('=== Environment Variables Status ===');
console.log('MSG91_AUTH_KEY:', process.env.MSG91_AUTH_KEY ? 'PRESENT' : 'MISSING');
console.log('MSG91_FLOW_ID:', process.env.MSG91_FLOW_ID ? 'PRESENT' : 'MISSING');
console.log('MSG91_OTP_VAR_NAME:', process.env.MSG91_OTP_VAR_NAME || 'OTP (default)');
console.log('MSG91_TEMPLATE_ID:', process.env.MSG91_TEMPLATE_ID ? 'PRESENT' : 'MISSING');
console.log('MSG91_DLT_TEMPLATE_ID:', process.env.MSG91_DLT_TEMPLATE_ID ? 'PRESENT' : 'MISSING');
console.log('MSG91_SENDER_ID:', process.env.MSG91_SENDER_ID ? 'PRESENT' : 'MISSING');
console.log('SUPABASE_SMS_HOOK_SECRET:', process.env.SUPABASE_SMS_HOOK_SECRET ? 'PRESENT' : 'MISSING');
if (process.env.SUPABASE_SMS_HOOK_SECRET) {
    const s = process.env.SUPABASE_SMS_HOOK_SECRET.trim();
    console.log('SUPABASE_SMS_HOOK_SECRET format:', s.startsWith('v1,whsec_') ? 'v1,whsec_ (valid prefix)' : s.startsWith('whsec_') ? 'whsec_ (valid prefix)' : 'other/custom format');
}
