import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

// Use globalThis to preserve the singleton across Next.js HMR reloads in dev.
// In production, a plain module-level variable would suffice, but in dev,
// each file save invalidates the module and resets module-level variables,
// creating multiple Supabase instances that compete for the same browser lock.
declare global {
  var __supabaseBrowserClient: SupabaseBrowserClient | undefined;
}

export function createClient(): SupabaseBrowserClient {
  if (globalThis.__supabaseBrowserClient) {
    return globalThis.__supabaseBrowserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!');
    throw new Error('Supabase URL and Key are required for the browser client.');
  }

  globalThis.__supabaseBrowserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Custom lock function to bypass Navigator LockManager timeout in development
        lock: async (name: string, acquireTimeout: number, acquire: () => Promise<any>) => {
          return await acquire();
        },
      }
    }
  );
  return globalThis.__supabaseBrowserClient;
}
