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

async function promoteToAdmin(email) {
    console.log(`--- Promoting ${email} to Admin ---`);

    // 1. Check if profile exists
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (fetchError) {
        if (fetchError.code === 'PGRST116') {
            console.error(`Error: User with email ${email} not found in profiles table.`);
            console.log('Ensure the user has signed up first.');
        } else {
            console.error('Error fetching profile:', fetchError);
        }
        return;
    }

    console.log('Current Profile:', profile);

    if (profile.role === 'admin') {
        console.log(`User ${email} is already an admin.`);
        return;
    }

    // 2. Update role to admin
    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', profile.id)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating profile:', updateError);
    } else {
        console.log('Successfully promoted to admin!');
        console.log('Updated Profile:', updatedProfile);
    }
}

const targetEmail = 'root@rootloom.in';
promoteToAdmin(targetEmail).catch(console.error);
