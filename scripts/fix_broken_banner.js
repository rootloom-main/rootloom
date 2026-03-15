
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixBanner() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const cleanUrl = "https://images.unsplash.com/photo-1529139513466-4209148b4830?auto=format&fit=crop&q=80&w=1920";
    
    console.log('Updating "CLIQUE ONLY" banner with clean URL...');
    const { data, error } = await supabase
        .from('banners')
        .update({ image_url: cleanUrl })
        .eq('title', 'CLIQUE ONLY');

    if (error) {
        console.error('Error updating banner:', error);
    } else {
        console.log('Successfully fixed "CLIQUE ONLY" banner image URL.');
    }
}

fixBanner();
