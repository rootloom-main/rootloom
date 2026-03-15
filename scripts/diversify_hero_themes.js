
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function diversifyThemes() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Fetch all active hero banners
    const { data: banners, error: fetchError } = await supabase
        .from('banners')
        .select('*')
        .eq('position', 'hero')
        .eq('active', true)
        .order('display_order', { ascending: true });

    if (fetchError || !banners) {
        console.error('Error fetching banners:', fetchError);
        return;
    }

    const themeAssignments = [
        'streetwear',    // 1. Black/Pink
        'electric',      // 2. Bold Blue/Yellow
        'minimal-urban', // 3. Clean White/Black
        'sunset',        // 4. Vibrant Gradient
        'graffiti',      // 5. Gritty Gray/Neon Green
        'neon'           // 6. Deep Purple/Neon Green
    ];

    console.log('Diversifying themes for 6 banners...');

    for (let i = 0; i < banners.length; i++) {
        const banner = banners[i];
        const newTheme = themeAssignments[i] || 'default';
        const updatedMetadata = { 
            ...(banner.metadata || {}), 
            theme: newTheme 
        };

        const { error: updateError } = await supabase
            .from('banners')
            .update({ metadata: updatedMetadata })
            .eq('id', banner.id);

        if (updateError) {
            console.error(`Error updating banner ${banner.id}:`, updateError);
        } else {
            console.log(`Updated banner ${i+1} (${banner.title}) with theme: ${newTheme}`);
        }
    }

    console.log('Theme diversification complete!');
}

diversifyThemes();
