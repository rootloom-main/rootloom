
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyAllBanners() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const { data: banners, error } = await supabase
        .from('banners')
        .select('*')
        .eq('position', 'hero')
        .eq('active', true);

    if (error) {
        console.error('Error fetching banners:', error);
    } else {
        console.log('--- Current Active Hero Banners ---');
        banners.forEach((b, i) => {
            console.log(`${i+1}. ${b.title}: ${b.image_url.substring(0, 60)}...`);
            // Check for any control characters or whitespace
            if (/\s/.test(b.image_url)) {
                console.log(`   [WARNING] Whitespace detected in ${b.title} URL!`);
            }
        });
    }
}

verifyAllBanners();
