
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function refineBanners() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    console.log('Applying specific user refinements...');

    // 1. Change CLIQUE ONLY image to local street_vibes.png
    const { error: error1 } = await supabase
        .from('banners')
        .update({ image_url: '/images/hero/street_vibes.png' })
        .eq('title', 'CLIQUE ONLY');

    if (error1) console.error('Error updating CLIQUE ONLY:', error1);
    else console.log('Updated CLIQUE ONLY image to street_vibes.png');

    // 2. Change theme of NEON NIGHTS
    // Let's first get current metadata to preserve other fields
    const { data: neonBanner } = await supabase
        .from('banners')
        .select('metadata')
        .eq('title', 'NEON NIGHTS')
        .single();

    if (neonBanner) {
        const updatedMetadata = { 
            ...(neonBanner.metadata || {}), 
            theme: 'cyber' // Changed to cyber for variety
        };
        const { error: error2 } = await supabase
            .from('banners')
            .update({ metadata: updatedMetadata })
            .eq('title', 'NEON NIGHTS');
        
        if (error2) console.error('Error updating NEON NIGHTS theme:', error2);
        else console.log('Updated NEON NIGHTS theme to "cyber"');
    }

    console.log('Refinements complete!');
}

refineBanners();
