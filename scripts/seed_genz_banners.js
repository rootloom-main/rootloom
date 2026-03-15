
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function seedGenZBanners() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    console.log('Deactivating existing hero banners...');
    await supabase
        .from('banners')
        .update({ active: false })
        .eq('position', 'hero');

    const newBanners = [
        {
            title: 'STREET VIBES ONLY',
            description: 'The definitive streetwear collection for those who move differently. Limited drop available now.',
            image_url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=80&w=1920',
            link: '/shop',
            position: 'hero',
            active: true,
            display_order: 1,
            metadata: {
                badge: 'DROP 01 // LOADED',
                theme: 'streetwear',
                cta: 'SHOP THE DROP'
            }
        },
        {
            title: 'NEON NIGHTS',
            description: 'Stand out in the dark with our latest reflective cyber-wear. Future-ready styles.',
            image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1920',
            link: '/shop',
            position: 'hero',
            active: true,
            display_order: 2,
            metadata: {
                badge: 'CYBER MONDAY EXCLUSIVE',
                theme: 'cyber',
                cta: 'GRAB THE GLOW'
            }
        },
        {
            title: 'MINIMAL DRIP',
            description: 'Clean lines, bold statements. The monochromatic collection for the modern minimalist.',
            image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1920',
            link: '/shop',
            position: 'hero',
            active: true,
            display_order: 3,
            metadata: {
                badge: 'ESSENTIALS 2026',
                theme: 'minimal-urban',
                cta: 'VIEW ESSENTIALS'
            }
        }
    ];

    console.log('Inserting new Gen-Z banners...');
    const { data, error } = await supabase
        .from('banners')
        .insert(newBanners);

    if (error) {
        console.error('Error seeding banners:', error);
    } else {
        console.log('Successfully seeded Gen-Z banners');
    }
}

seedGenZBanners();
