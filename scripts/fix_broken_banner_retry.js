
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixBannerRetry() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Using a different, confirmed reliable Unsplash image for streetwear
    const newUrl = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1920";
    
    console.log('Updating "CLIQUE ONLY" banner with a fresh confirmed URL...');
    const { data, error } = await supabase
        .from('banners')
        .update({ image_url: newUrl })
        .eq('title', 'CLIQUE ONLY');

    if (error) {
        console.error('Error updating banner:', error);
    } else {
        console.log('Successfully updated "CLIQUE ONLY" image URL with a fresh source.');
    }
}

fixBannerRetry();
