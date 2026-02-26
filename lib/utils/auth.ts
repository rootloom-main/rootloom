import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export async function createSSRClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}

export async function getCurrentUser() {
  try {
    const supabase = await createSSRClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error fetching Supabase user in Server Component', error);
    return null;
  }
}

export async function getUserProfile() {
  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as any;

  return profile;
}

export async function isAdmin() {
  const user = await getCurrentUser();

  if (user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'superadmin') return true;

  const profile = await getUserProfile();
  return profile?.role === 'admin' || profile?.role === 'superadmin';
}
