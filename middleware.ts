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
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }

  // Create a strict CSP
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://js.stripe.com https://v2.posthog.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https: https://razorpay.com *.razorpay.com;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://checkout.razorpay.com https://api.razorpay.com;
    frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com;
    connect-src 'self' wss: https: https://api.razorpay.com https://lumberjack-cx.razorpay.com;
    upgrade-insecure-requests;
`
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

  // Create an unmodified response with the new headers
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also attach it directly to the outgoing response back to the browser
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue
  )

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This will refresh the session if expired - critical for Server Components
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Admin routes protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user || userError) {
      console.log('Middleware: Redirecting to login - No user or error', userError?.message);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Account routes protection
  if (request.nextUrl.pathname.startsWith('/account')) {
    if (!user || userError) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
