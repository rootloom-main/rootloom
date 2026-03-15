
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function revertToUnsplash() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const bannerFixes = [
        { title: 'STREET VIBES ONLY', url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=1920' },
        { title: 'NEON NIGHTS', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1920' },
        { title: 'MINIMAL DRIP', url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1920' },
        { title: 'RETRO RUSH', url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=1920' },
        { title: 'URBAN EXPLORER', url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1920' },
        { title: 'CLIQUE ONLY', url: 'https://images.unsplash.com/photo-1529139513466-4209148b4830?auto=format&fit=crop&q=80&w=1920' }
    ];

    console.log('Reverting all 6 hero banners to original Unsplash URLs...');

    for (const fix of bannerFixes) {
        const { error } = await supabase
            .from('banners')
            .update({ image_url: fix.url })
            .eq('title', fix.title);

        if (error) {
            console.error(`Error updating banner "${fix.title}":`, error);
        } else {
            console.log(`Reverted "${fix.title}" to Unsplash path.`);
        }
    }

    console.log('Reversion complete! Please refresh localhost:3000 to review.');
}

revertToUnsplash();
