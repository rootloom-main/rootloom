const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndFixUser(email) {
    console.log(`--- Checking user: ${email} ---`);

    // 1. Check auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error listing users:', authError);
        return;
    }

    const authUser = users.find(u => u.email === email);

    if (!authUser) {
        console.error(`Error: User ${email} does not exist in auth.users.`);
        // console.log('Available users are:');
        // console.table(users.map(u => ({ id: u.id, email: u.email })));
        return;
    }

    console.log('User found in auth.users:', { id: authUser.id, email: authUser.email });

    // 2. Check profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
        return;
    }

    if (profile) {
        console.log('Profile already exists:', profile);
    } else {
        console.log('Profile not found in profiles table.');
    }

    // 3. Promote to admin (Create or Update)
    console.log('Promoting to admin...');
    const { data: updatedProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
            id: authUser.id,
            email: authUser.email,
            role: 'admin',
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (upsertError) {
        console.error('Error upserting profile:', upsertError);
    } else {
        console.log('Successfully promoted to admin!');
        console.log('Final Profile:', updatedProfile);
    }
}

const targetEmail = 'root@rootloom.in';
checkAndFixUser(targetEmail).catch(console.error);
