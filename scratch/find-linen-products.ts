import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    const { data: linenProducts } = await supabase
        .from('products')
        .select('id, name, slug, status, deleted_at')
        .ilike('name', '%linen%');
    console.log('Total linen products in DB (ilike):', linenProducts?.length);
    console.log(linenProducts);

    const { data: cottonProducts } = await supabase
        .from('products')
        .select('id, name, slug, status, deleted_at')
        .ilike('name', '%cotton%');
    console.log('Total cotton products in DB (ilike):', cottonProducts?.length);
}

run();
