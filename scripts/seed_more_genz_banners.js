
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedMoreBanners() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const moreBanners = [
        {
            title: 'RETRO RUSH',
            description: 'Old school meets new cool. Vintage silhouettes re-imagined for the modern age.',
            image_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=1920',
            link: '/shop',
            position: 'hero',
            active: true,
            display_order: 4,
            metadata: {
                badge: 'VINTAGE VIBES',
                theme: 'neon',
                cta: 'SHOP COLLECTION'
            }
        },
        {
            title: 'URBAN EXPLORER',
            description: 'Gear up for the city heat. Technical fabrics with a cutting-edge fashion profile.',
            image_url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1920',
            link: '/shop',
            position: 'hero',
            active: true,
            display_order: 5,
            metadata: {
                badge: 'UTILITY // CORE',
                theme: 'cyber',
                cta: 'VIEW GEAR'
            }
        },
        {
            title: 'CLIQUE ONLY',
            description: 'Tag your squad. Matching fits and eclectic styles for the inner circle.',
            image_url: 'https://images.unsplash.com/photo-1529139513466-4209148b4830?auto=format&fit=crop&q=80&w=1920',
            link: '/shop',
            position: 'hero',
            active: true,
            display_order: 6,
            metadata: {
                badge: 'SQUAD GOALS',
                theme: 'streetwear',
                cta: 'JOIN THE CLIQUE'
            }
        }
    ];

    console.log('Inserting 3 additional Gen-Z banners...');
    const { data, error } = await supabase
        .from('banners')
        .insert(moreBanners);

    if (error) {
        console.error('Error seeding banners:', error);
    } else {
        console.log('Successfully added 3 more Gen-Z banners (Total 6)');
    }
}

seedMoreBanners();
