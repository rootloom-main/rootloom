import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    try {
        console.log('Fetching users from auth.users...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) {
            console.error('Error listing auth users:', authError);
            return;
        }
        console.log(`Found ${authUsers.users.length} auth users.`);

        console.log('Fetching profiles...');
        const { data: profiles, error: pError } = await supabase.from('profiles').select('id');
        if (pError) {
            console.error('Error fetching profiles:', pError);
            return;
        }
        console.log(`Found ${profiles.length} profiles.`);

        const profileIds = new Set(profiles.map(p => p.id));
        const missingProfiles = authUsers.users.filter(u => !profileIds.has(u.id));

        console.log(`Number of users missing profiles: ${missingProfiles.length}`);
        
        for (const u of missingProfiles) {
            console.log(`Creating profile for User ID: ${u.id}, Email: ${u.email || 'N/A'}, Phone: ${u.phone || 'N/A'}`);
            
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    id: u.id,
                    email: u.email || null,
                    phone: u.phone || null,
                    full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
                    role: 'user'
                });

            if (insertError) {
                console.error(`Failed to create profile for ${u.id}:`, insertError.message);
            } else {
                console.log(`Profile created successfully for ${u.id}.`);
            }
        }

        console.log('Profile fix complete.');
    } catch (e: any) {
        console.error('Execution error:', e);
    }
}

run();
