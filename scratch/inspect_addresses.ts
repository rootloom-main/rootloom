import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    try {
        console.log('Fetching a profile...');
        const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(5);
        if (pError) {
            console.error('Error fetching profiles:', pError);
            return;
        }
        console.log('Profiles found:', profiles);

        if (profiles && profiles.length > 0) {
            const user = profiles[0];
            console.log(`Using profile ID: ${user.id} (${user.full_name || 'No Name'})`);

            // Try inserting a dummy address
            console.log('Inserting dummy address...');
            const { data: newAddr, error: addrError } = await supabase
                .from('addresses')
                .insert({
                    user_id: user.id,
                    full_name: 'Test Name',
                    phone: '9690335921',
                    address_line1: 'Test Address Line 1',
                    address_line2: 'Test Address Line 2',
                    city: 'Test City',
                    state: 'Test State',
                    postal_code: '123456',
                    country: 'India',
                    is_default: false,
                    type: 'Home'
                })
                .select();

            if (addrError) {
                console.error('Error adding address:', addrError);
            } else {
                console.log('Address inserted successfully:', newAddr);
                // Clean up the dummy address
                console.log('Deleting dummy address...');
                const { error: delError } = await supabase
                    .from('addresses')
                    .delete()
                    .eq('id', newAddr[0].id);
                if (delError) console.error('Error deleting address:', delError);
                else console.log('Address deleted successfully.');
            }
        } else {
            console.log('No profiles found in the database.');
        }

    } catch (e: any) {
        console.error('Execution error:', e);
    }
}

run();
