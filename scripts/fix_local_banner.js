
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixLocalBanner() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Using local path instead of Unsplash
    const localUrl = "/images/hero/clique_only.png";
    
    console.log('Updating "CLIQUE ONLY" banner with a stable local file path...');
    const { data, error } = await supabase
        .from('banners')
        .update({ image_url: localUrl })
        .eq('title', 'CLIQUE ONLY');

    if (error) {
        console.error('Error updating banner:', error);
    } else {
        console.log('Successfully updated "CLIQUE ONLY" with LOCAL image path.');
    }
}

fixLocalBanner();
