import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/rate-limit';

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const path = request.nextUrl.pathname;

  // Protect sensitive routes: auth, checkout, orders
  const requiresRateLimit = path.startsWith('/api/auth') ||
    path.startsWith('/api/checkout') ||
    path.startsWith('/api/orders') ||
    path.startsWith('/auth'); // also protect frontend auth routes

  if (requiresRateLimit) {
    const { success } = await checkRateLimit(ip);
    if (!success) {
      return NextResponse.json({ message: 'Too Many Requests' }, { status: 429 });
    }
  }

  // 1. Create a strict CSP
  const isDev = process.env.NODE_ENV === 'development';
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://v2.posthog.com https://us-assets.i.posthog.com blob:;
    worker-src 'self' blob:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https: https://razorpay.com;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://checkout.razorpay.com https://api.razorpay.com;
    frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com;
    connect-src 'self' wss: https: https://api.razorpay.com https://us.i.posthog.com blob:;
    ${isDev ? '' : 'upgrade-insecure-requests;'}
  `;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Set the CSP header so Next.js can read it if needed
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue
  )

  // 2. Initialize the base response
  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Add CSP before returning
    response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
    return response;
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
            request,
          });
          
          // Also set the cookies on the new response for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 4. Check session - this is used for basic routing logic
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const user = session?.user;

  // 5. Protected Routes Handling
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAccountRoute = request.nextUrl.pathname.startsWith('/account');

  // Redirect to login if NO user and trying to access protected routes
  if ((isAdminRoute || isAccountRoute) && (!user || sessionError)) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard/home if USER IS logged in and trying to access auth pages (login/signup)
  if (isAuthRoute && user && !sessionError && !request.nextUrl.pathname.includes('/callback')) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  // 6. Finalize CSP - Attach to the actual final response object
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue
  );

  return response;
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
