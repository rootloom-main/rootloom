
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkBanner() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const { data: banner, error } = await supabase
        .from('banners')
        .select('*')
        .eq('title', 'CLIQUE ONLY')
        .single();

    if (error) {
        console.error('Error fetching banner:', error);
    } else {
        console.log('Banner Data:', JSON.stringify(banner, null, 2));
    }
}

checkBanner();
