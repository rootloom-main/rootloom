
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function localizeAllBanners() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const bannerFixes = [
        { title: 'STREET VIBES ONLY', url: '/images/hero/street_vibes.png' },
        { title: 'NEON NIGHTS', url: '/images/hero/neon_nights.png' },
        { title: 'MINIMAL DRIP', url: '/images/hero/minimal_drip.png' },
        { title: 'RETRO RUSH', url: '/images/hero/retro_rush.png' },
        { title: 'URBAN EXPLORER', url: '/images/hero/urban_explorer.png' },
        { title: 'CLIQUE ONLY', url: '/images/hero/clique_only.png' }
    ];

    console.log('Localizing all 6 hero banners for permanent stability...');

    for (const fix of bannerFixes) {
        const { error } = await supabase
            .from('banners')
            .update({ image_url: fix.url })
            .eq('title', fix.title);

        if (error) {
            console.error(`Error updating banner "${fix.title}":`, error);
        } else {
            console.log(`Updated "${fix.title}" with local path: ${fix.url}`);
        }
    }

    console.log('All hero banners localized successfully!');
}

localizeAllBanners();
