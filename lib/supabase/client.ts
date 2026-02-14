import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!');
    throw new Error('Supabase URL and Key are required for the browser client.');
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey
  );
}
