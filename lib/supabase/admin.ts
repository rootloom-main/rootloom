import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error('Supabase URL is required.');
    }

    if (!supabaseServiceRoleKey) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to NEXT_PUBLIC_SUPABASE_ANON_KEY for createAdminClient.');
        supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }

    if (!supabaseServiceRoleKey) {
        throw new Error('Supabase service role key or anon key is required.');
    }

    return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
