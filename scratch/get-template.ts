import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    const { data: defaultTemplate } = await supabase
        .from('invoice_templates')
        .select(`
            id,
            is_default,
            invoice_template_versions (
                id,
                html,
                css,
                status
            )
        `)
        .eq('is_default', true)
        .maybeSingle();

    const activeVersion = defaultTemplate?.invoice_template_versions?.find(
        (v: any) => v.status === 'active'
    );

    console.log('Active Version HTML:', activeVersion?.html);
    console.log('Active Version CSS:', activeVersion?.css);
}

run();
