const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = envContent.split(/\r?\n/).reduce((acc, line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/['"`]/g, '');
        acc[key] = val;
    }
    return acc;
}, {});
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('banners').select('*').then(({ data, error }) => {
    console.log('Error:', error);
    console.log('BANNERS:', JSON.stringify(data, null, 2));
}).catch(console.error);
