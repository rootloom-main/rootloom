import { createClient } from '@supabase/supabase-js';
const client = createClient('https://xyz.supabase.co', 'key');
client.auth.signInWithOtp({
    phone: '+123',
    options: { channel: 'whatsapp' }
});
