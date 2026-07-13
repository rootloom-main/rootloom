import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sanitizeRedirectPath } from '@/lib/utils/redirect';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as any;
    const next = sanitizeRedirectPath(searchParams.get('next'), '/');

    if (code || (token_hash && type)) {
        const cookieStore = await cookies();
        let response = NextResponse.redirect(`${origin}${next}`);

        const supabase = createServerClient(
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
                            cookiesToSet.forEach(({ name, value, options }) =>
                                response.cookies.set(name, value, options)
                            );
                        } catch {
                            // Ignored if called from a Server Component
                        }
                    },
                },
            }
        );

        if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) return response;
        } else if (token_hash && type) {
            const { error } = await supabase.auth.verifyOtp({
                token_hash,
                type,
            });
            if (!error) return response;
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
