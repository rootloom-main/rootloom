type CookieLike = { name: string };

/** True for the Supabase SSR session cookie and its chunked cookie variants. */
export function hasSupabaseAuthCookie(cookies: CookieLike[]) {
    return cookies.some(({ name }) =>
        name === 'sb-access-token' || /^sb-.+-auth-token(?:\.\d+)?$/.test(name),
    );
}
