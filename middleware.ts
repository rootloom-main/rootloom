import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/rate-limit';

function getContentSecurityPolicy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';
  const isHttp = request.nextUrl.protocol === 'http:';
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.razorpay.com https://v2.posthog.com https://us-assets.i.posthog.com blob:",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https: https://*.razorpay.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.razorpay.com",
    "frame-src 'self' https://*.razorpay.com",
    "child-src 'self' https://*.razorpay.com",
    "connect-src 'self' wss: https: https://*.razorpay.com https://us.i.posthog.com blob:",
  ];

  if (!isDev && !isHttp) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

function withSecurityHeaders(response: NextResponse, contentSecurityPolicy: string) {
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://*.razorpay.com")');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  return response;
}

function withRouteCacheHeaders(response: NextResponse, path: string) {
  if (path.startsWith('/api/search')) {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
  } else if (path.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const path = request.nextUrl.pathname;
  const contentSecurityPolicy = getContentSecurityPolicy(request);

  const isMutationRequest = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);

  // Protect sensitive mutations. Public auth page renders and signature-verified webhooks handle their own security.
  const requiresRateLimit =
    (path.startsWith('/api/auth') && !path.startsWith('/api/auth/sms-provider') && isMutationRequest) ||
    path.startsWith('/api/checkout') ||
    path.startsWith('/api/orders');

  if (requiresRateLimit) {
    const { success } = await checkRateLimit(ip);
    if (!success) {
      return withRouteCacheHeaders(withSecurityHeaders(
        NextResponse.json({ message: 'Too Many Requests' }, { status: 429 }),
        contentSecurityPolicy
      ), path);
    }
  }

  // Set the CSP header so Next.js can read it if needed
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(
    'Content-Security-Policy',
    contentSecurityPolicy
  )

  // 2. Initialize the base response
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const utmSource = request.nextUrl.searchParams.get('utm_source');

  if (utmSource) {
    response.cookies.set('rootloom_attribution', JSON.stringify({
      utm_source: utmSource,
      utm_medium: request.nextUrl.searchParams.get('utm_medium') || undefined,
      utm_campaign: request.nextUrl.searchParams.get('utm_campaign') || undefined,
      utm_content: request.nextUrl.searchParams.get('utm_content') || undefined,
      utm_term: request.nextUrl.searchParams.get('utm_term') || undefined,
      landing_path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
      captured_at: new Date().toISOString(),
    }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 14,
      path: '/',
    });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return withRouteCacheHeaders(withSecurityHeaders(response, contentSecurityPolicy), path);
  }

  // 3. Create Supabase client with robust cookie handling
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          
          // Re-create the response to include the new cookies in the request
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          
          // Also set the cookies on the new response for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 4. Check verified user for routing. getUser validates the token with Supabase Auth.
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // 5. Protected Routes Handling
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAccountRoute = request.nextUrl.pathname.startsWith('/account');
  const isCheckoutRoute = request.nextUrl.pathname === '/checkout';

  const authPath = request.nextUrl.pathname;
  const authRoutesAllowedWhenSignedIn = [
    '/auth/callback',
    '/auth/onboarding',
    '/auth/auth-code-error',
  ];

  // Redirect to login if NO user and trying to access protected routes
  if ((isAdminRoute || isAccountRoute || isCheckoutRoute) && (!user || userError)) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return withRouteCacheHeaders(withSecurityHeaders(NextResponse.redirect(redirectUrl), contentSecurityPolicy), path);
  }

  // Redirect to dashboard/home if USER IS logged in and trying to access auth pages (login/signup)
  if (
    isAuthRoute &&
    user &&
    !userError &&
    !authRoutesAllowedWhenSignedIn.some((allowedPath) => authPath.startsWith(allowedPath))
  ) {
    return withRouteCacheHeaders(withSecurityHeaders(
      NextResponse.redirect(new URL('/account', request.url)),
      contentSecurityPolicy
    ), path);
  }

  // 6. Finalize CSP - Attach to the actual final response object
  return withRouteCacheHeaders(withSecurityHeaders(response, contentSecurityPolicy), path);
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
