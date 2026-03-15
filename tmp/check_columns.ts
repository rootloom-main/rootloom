
import { createClient } from './lib/supabase/client';

async function check() {
    const supabase = createClient();
    const { data, error } = await supabase.from('products').select('*').limit(1).single();
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Product columns:', Object.keys(data));
}

check();
