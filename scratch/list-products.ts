import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, serviceKey!);

async function run() {
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, metadata')
        .eq('status', 'active')
        .limit(10);
    
    if (error) {
        console.error(error);
        return;
    }
    console.log("Product Metadata:");
    console.log(JSON.stringify(products, null, 2));
}

run();
