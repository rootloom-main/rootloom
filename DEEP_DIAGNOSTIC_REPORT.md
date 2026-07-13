# Codebase Health & Completeness Report

Audit target: `D:\rootloom\ecom`  
Audit date: 2026-05-19  
Scope: Next.js App Router app, API routes, Server Actions, Supabase migrations/RLS, Razorpay checkout, inventory, auth, email, cron, dependency/security posture.

I inspected the actual project files with `rg`, line-numbered file reads, `npm ls --depth=0`, and `npm audit --omit=dev --json`. This report intentionally focuses on concrete defects and production risks.

## Executive Summary

The project has several strong pieces: Razorpay verification fetches payment/order state server-side, payment signatures use `crypto.timingSafeEqual` in `verify-payment`, inventory reservations exist, and admin pages are server-gated by profile role.

The main production risks are:

- [CRITICAL] `next@13.5.1` has known critical/high advisories from `npm audit`.
- [CRITICAL] `product_waitlist` and `ops_events` are created without RLS in the latest migration.
- [CRITICAL] checkout APIs accept `addressId` from the client and use admin privileges without verifying the address belongs to the current user.
- [CRITICAL] debug route `/api/debug/order-fetch` returns joined order/profile/address data and is not admin-gated.
- [WARNING] webhook signature comparison is not timing-safe.
- [WARNING] several background/email/cron flows swallow failures or mark success before all side effects are durable.
- [WARNING] security headers are incomplete beyond CSP.

## Findings

### [CRITICAL] Vulnerable production framework: `next@13.5.1`

- File: `D:\rootloom\ecom\package.json:72`
- Evidence: `npm audit --omit=dev --json` reported `next` as `critical`, with fix available at `13.5.11`.
- Impact: Known Next.js advisories include Server Action SSRF, cache poisoning, middleware/proxy bypass, App Router XSS-related advisories, and RSC/image DoS issues.
- Fix: Upgrade Next to at least `13.5.11` if staying on Next 13, then run full regression tests. Prefer a planned jump to a supported modern Next version after checking `@supabase/ssr`, Sentry, and PWA compatibility.

### [CRITICAL] `product_waitlist` stores PII but has no RLS enabled

- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:23`
- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:27`
- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:28`
- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:29`
- Evidence: The table includes `user_id`, `email`, and `phone`, but the migration never runs `ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY` and defines no policies.
- Impact: In Supabase, new tables commonly have public schema grants. Without RLS, client access can expose or modify waitlist PII depending on grants/API settings.
- Fix: Enable RLS. Allow anonymous/registered insert only through narrowly constrained policy or only via server route. Allow owner select/update for `auth.uid() = user_id`; admin/service role full access.

### [CRITICAL] `ops_events` has no RLS despite storing operational/user/payment metadata

- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:1`
- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:6`
- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:8`
- File: `D:\rootloom\ecom\supabase\migrations\20260414001000_ops_events_and_waitlist.sql:10`
- Evidence: `ops_events` includes `user_id`, `payment_id`, `reference`, and arbitrary `metadata`, but no RLS enablement or policies.
- Impact: Internal events can leak payment IDs, customer identifiers, failure reasons, and campaign metadata.
- Fix: Enable RLS and make the table service-role/admin-only. Do not expose it to anon/authenticated clients.

### [CRITICAL] Checkout address ownership is not verified before creating Razorpay payment records

- File: `D:\rootloom\ecom\app\api\razorpay\create-order\route.ts:54`
- File: `D:\rootloom\ecom\app\api\razorpay\create-order\route.ts:260`
- File: `D:\rootloom\ecom\app\api\razorpay\create-order\route.ts:336`
- Evidence: `addressId` is taken from request JSON and inserted into Razorpay notes/payment metadata using an admin client. I found no query that verifies `addresses.id = addressId AND addresses.user_id = user.id`.
- Impact: A logged-in user who guesses/obtains another address UUID could attach another customer's address to their payment/order flow.
- Fix: Before creating payment/order, query `addresses` with the user-scoped Supabase client or admin query with `.eq('id', addressId).eq('user_id', user.id)`. Reject if not found.

### [CRITICAL] COD checkout has the same address ownership gap

- File: `D:\rootloom\ecom\app\api\checkout\cod\route.ts:24`
- File: `D:\rootloom\ecom\app\api\checkout\cod\route.ts:92`
- File: `D:\rootloom\ecom\app\api\checkout\cod\route.ts:98`
- Evidence: COD accepts `addressId` from JSON and passes it to `processOrderCreation()` using the admin client, without validating ownership or even presence.
- Impact: Same cross-user address attachment risk; also COD orders can be attempted with missing/invalid address IDs and fail late inside DB constraints.
- Fix: Validate `addressId` before cart/order processing.

### [CRITICAL] Ungated debug endpoint can expose order joins

- File: `D:\rootloom\ecom\app\api\debug\order-fetch\route.ts:4`
- File: `D:\rootloom\ecom\app\api\debug\order-fetch\route.ts:48`
- File: `D:\rootloom\ecom\app\api\debug\order-fetch\route.ts:50`
- File: `D:\rootloom\ecom\app\api\debug\order-fetch\route.ts:51`
- Evidence: `/api/debug/order-fetch?id=...` is publicly routable code. It returns progressively richer order queries, including profile and shipping address joins.
- Impact: RLS may block some user access, but this endpoint is still production attack surface and can leak details for the caller's accessible rows. It also returns raw Supabase errors useful for reconnaissance.
- Fix: Delete this route or gate it behind `isAdmin()` and `NODE_ENV !== 'production'`.

### [CRITICAL] `isAdmin()` trusts mutable user metadata before DB role

- File: `D:\rootloom\ecom\lib\utils\auth.ts:79`
- File: `D:\rootloom\ecom\lib\utils\auth.ts:82`
- Evidence: `isAdmin()` returns true if `user.user_metadata.role` is `admin`/`superadmin` before checking the profile table.
- Impact: Supabase `user_metadata` is generally user-controlled unless locked down through app policy. Any admin API route using `isAdmin()` can become bypassable if a user can write that metadata.
- Fix: Remove the metadata shortcut. Source admin authority only from `profiles.role` read with service role, or from app_metadata/custom claims controlled only by service role.

### [WARNING] Middleware protects `/admin` pages, but not every admin API relies on middleware

- File: `D:\rootloom\ecom\middleware.ts:127`
- File: `D:\rootloom\ecom\middleware.ts:129`
- File: `D:\rootloom\ecom\app\api\admin\orders\[id]\label\route.ts:9`
- Evidence: middleware redirects `/admin`, but `/api/admin/*` endpoints are not covered by the middleware admin route branch. Most API routes call `isAdmin()`, but that currently has the user-metadata weakness above.
- Impact: API protection depends entirely on `isAdmin()` correctness.
- Fix: Fix `isAdmin()` first. Optionally extend middleware or shared API guard for `/api/admin`.

### [WARNING] Razorpay webhook signature comparison is not timing-safe

- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:46`
- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:51`
- Evidence: webhook compares `expectedSignature !== signature` as a string comparison.
- Impact: Lower probability than missing signature validation, but payment webhooks should use constant-time comparison.
- Fix: Use the same buffer-length check and `crypto.timingSafeEqual()` pattern already used in `verify-payment`.

### [WARNING] Razorpay webhook JSON parsing is outside a route-level try/catch

- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:55`
- Evidence: `JSON.parse(body)` can throw after signature verification and is not caught by a route-level handler.
- Impact: malformed signed payloads or body edge cases produce an unhandled 500 instead of controlled `400`.
- Fix: wrap parse in `try/catch` and return `{ received: false, message: 'Invalid JSON' }` with 400.

### [WARNING] Payment webhook marks captured payment as failed/manual-review while keeping reservation active

- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:21`
- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:26`
- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:221`
- Evidence: `markPaymentForManualReview()` sets `status: 'failed'` but preserves `reservation_status` as active.
- Impact: A captured payment that hits an order-processing bug can leave reserved stock held while the payment status says failed. That is operationally confusing and can starve inventory until manual cleanup.
- Fix: Use a separate status such as `manual_review` or keep payment status `pending_review`; do not overload `failed` for captured-money cases.

### [WARNING] Order creation does not await post-payment email/WhatsApp tasks before responding

- File: `D:\rootloom\ecom\lib\order-processing.ts:212`
- File: `D:\rootloom\ecom\lib\order-processing.ts:244`
- File: `D:\rootloom\ecom\lib\order-processing.ts:252`
- File: `D:\rootloom\ecom\app\api\razorpay\verify-payment\route.ts:257`
- Evidence: `processOrderCreation()` starts an async background task and returns it. `verify-payment` wraps the task in another unawaited async IIFE.
- Impact: order creation can return success while transactional email/low-stock alert/WhatsApp fails later. The user sees success regardless.
- Fix: For order confirmation email, either await and record email status, or enqueue a durable job with retry. Fire-and-forget is acceptable only if you persist the task.

### [WARNING] `sendOrderConfirmationEmail()` reports no result when email is skipped

- File: `D:\rootloom\ecom\lib\email.ts:31`
- File: `D:\rootloom\ecom\lib\email.ts:33`
- Evidence: when `RESEND_API_KEY` is missing, the function logs and returns `undefined`.
- Impact: callers using `Promise.allSettled()` cannot distinguish a skipped email from an intentionally completed no-op unless they inspect logs.
- Fix: return `{ success: false, skipped: true, error: 'Email service not configured' }`.

### [WARNING] Legacy abandoned cart cron uses user-scoped Supabase client and is probably functionally dead

- File: `D:\rootloom\ecom\app\api\cron\abandoned-cart\route.ts:14`
- File: `D:\rootloom\ecom\app\api\cron\abandoned-cart\route.ts:21`
- Evidence: cron route uses `createClient()` rather than service role. Because cron requests have no user session, RLS on `cart_items` will prevent reading users' carts.
- Impact: `/api/cron/abandoned-cart` will silently find no rows or fail under RLS, while `/api/cron/abandoned-carts` uses admin client correctly.
- Fix: delete the old singular route or convert it to admin client. Keep one canonical abandoned-cart cron.

### [WARNING] Contact form reports success even if DB insert fails

- File: `D:\rootloom\ecom\app\api\contact\route.ts:31`
- File: `D:\rootloom\ecom\app\api\contact\route.ts:33`
- File: `D:\rootloom\ecom\app\api\contact\route.ts:78`
- Evidence: DB errors are logged but the route continues to email and returns success.
- Impact: users can receive success while the admin dashboard has no saved inquiry. If email also fails later, data is lost.
- Fix: Return failure if persistence fails, or explicitly mark response as email-only and record fallback.

### [WARNING] Contact email HTML interpolates unsanitized user input

- File: `D:\rootloom\ecom\app\api\contact\route.ts:51`
- File: `D:\rootloom\ecom\app\api\contact\route.ts:63`
- Evidence: `name`, `email`, and `message` are inserted directly into HTML email.
- Impact: email-client HTML injection risk and admin phishing risk.
- Fix: HTML-escape all user-controlled fields before interpolating into email templates.

### [WARNING] Return submission can throw unhandled on malformed refund JSON

- File: `D:\rootloom\ecom\app\api\user\returns\route.ts:107`
- Evidence: `JSON.parse(refundDetailsRaw)` runs outside a `try/catch`.
- Impact: malformed form data causes a 500 instead of a 400 with useful client feedback.
- Fix: validate with Zod or catch JSON parse errors and reject with 400.

### [WARNING] Return upload accepts arbitrary file type/size

- File: `D:\rootloom\ecom\app\api\user\returns\route.ts:16`
- File: `D:\rootloom\ecom\app\api\user\returns\route.ts:80`
- File: `D:\rootloom\ecom\app\api\user\returns\route.ts:85`
- Evidence: only presence/size > 0 is checked. No MIME allowlist, extension allowlist, or max upload size is enforced.
- Impact: storage abuse and unsafe file content in the private bucket.
- Fix: enforce max size and image MIME types before upload; generate safe extension from MIME, not original filename.

### [WARNING] `app/api/waitlist` swallows server errors without logging

- File: `D:\rootloom\ecom\app\api\waitlist\route.ts:59`
- File: `D:\rootloom\ecom\app\api\waitlist\route.ts:60`
- Evidence: catch returns `error.message` to client but does not log or record an ops event.
- Impact: failed waitlist writes are invisible unless the client reports them.
- Fix: log sanitized error and record `growth.waitlist.signup` failure.

### [WARNING] `lib/actions/cart.ts` hides fetch failures as empty cart

- File: `D:\rootloom\ecom\lib\actions\cart.ts:38`
- File: `D:\rootloom\ecom\lib\actions\cart.ts:40`
- Evidence: `getCart()` logs Supabase errors and returns `[]`.
- Impact: transient DB/RLS failures look like an empty cart, which can mislead checkout state.
- Fix: return `{ success:false, message }` or throw a controlled error for the provider to display.

### [WARNING] Guest cart can store invalid/unbounded quantity client-side

- File: `D:\rootloom\ecom\components\providers\cart-provider.tsx:195`
- File: `D:\rootloom\ecom\components\providers\cart-provider.tsx:201`
- File: `D:\rootloom\ecom\components\providers\cart-provider.tsx:203`
- Evidence: guest cart increments quantity without applying the same max/stock/integer validation used server-side.
- Impact: login merge can fail partially or produce confusing cart state.
- Fix: enforce the same `MAX_CART_LIMIT`, integer, and stock constraints client-side, and have merge report per-item failures.

### [WARNING] Payment/inventory precheck ignores `reserved_quantity`

- File: `D:\rootloom\ecom\app\api\razorpay\create-order\route.ts:91`
- File: `D:\rootloom\ecom\lib\actions\cart.ts:64`
- File: `D:\rootloom\ecom\lib\actions\cart.ts:87`
- Evidence: UI/cart checks compare against `stock`, not `stock - reserved_quantity`. The reservation RPC does the correct final check at `supabase\migrations\20260226230000_inventory_locking.sql:29`.
- Impact: users can add/select stock that is already reserved by pending payments, causing checkout failure late.
- Fix: expose available stock as `stock - reserved_quantity` in cart/checkout reads.

### [WARNING] Webhook captured path is not wrapped in a top-level catch

- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:33`
- File: `D:\rootloom\ecom\app\api\razorpay\webhook\route.ts:62`
- Evidence: network failures in `fetchRazorpayPayment()`/`fetchRazorpayOrder()` occur before the inner processing `try/catch`.
- Impact: Razorpay webhook retries may happen, but the failure is not recorded in `ops_events`/Sentry for this branch.
- Fix: wrap the whole handler body after signature validation in `try/catch`.

### [WARNING] Security headers are incomplete

- File: `D:\rootloom\ecom\middleware.ts:29`
- File: `D:\rootloom\ecom\next.config.js:49`
- Evidence: CSP is set, but there is no `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, or COOP/CORP policy.
- Impact: weaker browser hardening for a payment storefront.
- Fix: add a central security header helper in middleware or `next.config.js`. Be careful with `frame-ancestors` and Razorpay flows.

### [WARNING] CSP still uses `unsafe-inline` and `unsafe-eval`

- File: `D:\rootloom\ecom\middleware.ts:9`
- Evidence: `script-src` allows both.
- Impact: CSP is much weaker against XSS. This may be required by Next/Razorpay/PostHog today, but it should be treated as a known security debt.
- Fix: move toward nonces/hashes for first-party inline scripts and document which third-party requires `unsafe-eval`.

### [WARNING] Environment files with real secrets exist in workspace

- File: `D:\rootloom\ecom\.gitignore:37`
- File: `D:\rootloom\ecom\.gitignore:39`
- Evidence: `.env.local`, `.env.production`, `.env.staging`, and `.env.local.utf8` exist locally and contain secret variable names. `git ls-files .env*` shows only `.env.example` is tracked.
- Impact: not currently committed, but high risk of accidental copy/upload. `.env.production` and `.env.staging` sitting in the repo folder are especially risky.
- Fix: keep only `.env.example` in project root; move real env files into the deployment provider/secret manager and outside the repo folder.

### [WARNING] `lib/env.ts` parses server secrets in a module that is not marked server-only

- File: `D:\rootloom\ecom\lib\env.ts:11`
- File: `D:\rootloom\ecom\lib\env.ts:15`
- File: `D:\rootloom\ecom\lib\env.ts:16`
- File: `D:\rootloom\ecom\lib\env.ts:19`
- Evidence: schema includes `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, etc. The file does not import `server-only`.
- Impact: if imported by a client component later, it can break builds or risk unintended env exposure patterns. Next normally only inlines `NEXT_PUBLIC_*`, but this is a footgun.
- Fix: split `env.client.ts` and `env.server.ts`; put `import 'server-only'` in the server env module.

### [WARNING] `processNextJob()` is not atomic under concurrent cron invocations

- File: `D:\rootloom\ecom\lib\jobs.ts:29`
- File: `D:\rootloom\ecom\lib\jobs.ts:42`
- Evidence: it selects a pending job, then updates it to processing in a separate statement without `FOR UPDATE SKIP LOCKED` or an atomic claim RPC.
- Impact: two cron invocations can process the same job.
- Fix: create a `claim_next_job()` SQL function using `FOR UPDATE SKIP LOCKED`, or update with `WHERE id = ? AND status = 'pending' RETURNING *`.

### [WARNING] `processNextJob()` ignores unknown job types and still marks completed

- File: `D:\rootloom\ecom\lib\jobs.ts:47`
- File: `D:\rootloom\ecom\lib\jobs.ts:48`
- File: `D:\rootloom\ecom\lib\jobs.ts:102`
- Evidence: only `whatsapp_broadcast` has implementation. `send_email` and `process_order` are in the type but no handler exists.
- Impact: queued jobs of those types become `completed` without doing work.
- Fix: implement each declared job type or throw for unsupported types.

### [WARNING] RLS admin policies are inconsistent about `superadmin`

- File: `D:\rootloom\ecom\supabase\migrations\20260128104436_create_ecommerce_schema.sql:190`
- File: `D:\rootloom\ecom\supabase\migrations\20260128104436_create_ecommerce_schema.sql:234`
- File: `D:\rootloom\ecom\supabase\migrations\20260128104436_create_ecommerce_schema.sql:452`
- Evidence: older policies check `profiles.role = 'admin'` only. Later code and some later policies use `admin` or `superadmin`.
- Impact: superadmins may pass server UI checks but fail direct RLS-protected client queries.
- Fix: normalize all admin RLS helper checks to `public.is_admin()` or `role IN ('admin','superadmin')`.

### [WARNING] `payments` table only defines user read policy, no explicit service/admin policies

- File: `D:\rootloom\ecom\supabase\migrations\20260313200000_create_payments_table.sql:23`
- File: `D:\rootloom\ecom\supabase\migrations\20260313200000_create_payments_table.sql:25`
- Evidence: RLS is enabled and only `"Users can read own payments"` is defined.
- Impact: current server code uses service role and bypasses RLS, so it works. But admin dashboards or future authenticated admin client reads will fail unless service role is always used.
- Fix: either keep payments service-role only deliberately, or add admin read policies.

### [OPTIMIZATION] Generated PWA artifacts are committed and noisy

- File: `D:\rootloom\ecom\public\sw.js:1`
- File: `D:\rootloom\ecom\public\workbox-f1770938.js:1`
- Evidence: generated Workbox assets live in `public/` and are currently dirty in git status.
- Impact: generated churn makes reviews noisy and can stale-cache old build assets.
- Fix: decide whether PWA output is generated at build time. If yes, ignore generated SW assets and avoid committing build-specific precache manifests.

### [OPTIMIZATION] Duplicate abandoned cart cron routes

- File: `D:\rootloom\ecom\app\api\cron\abandoned-cart\route.ts:8`
- File: `D:\rootloom\ecom\app\api\cron\abandoned-carts\route.ts:14`
- Evidence: both singular and plural routes exist. The plural route is more complete and uses service role; singular likely fails under RLS.
- Impact: confusion and wrong cron wiring risk.
- Fix: delete or redirect the singular route.

### [OPTIMIZATION] Unused or questionable dependencies add install/bundle/security surface

- File: `D:\rootloom\ecom\package.json:19`
- File: `D:\rootloom\ecom\package.json:21`
- File: `D:\rootloom\ecom\package.json:23`
- File: `D:\rootloom\ecom\package.json:51`
- File: `D:\rootloom\ecom\package.json:61`
- File: `D:\rootloom\ecom\package.json:99`
- File: `D:\rootloom\ecom\package.json:103`
- Evidence: `rg` found no runtime imports for `@google/generative-ai`, `@next/third-parties`, `@react-email/render`, `@vercel/analytics`, `k6`, or `@types/k6`. `@netlify/plugin-nextjs` is referenced by `netlify.toml`, but this project also has Vercel config.
- Impact: larger dependency tree and more audit findings.
- Fix: remove unused packages or move load-test-only packages out of production dependencies.

### [OPTIMIZATION] `@ducanh2912/next-pwa` is a direct source of audit issues

- File: `D:\rootloom\ecom\package.json:18`
- Evidence: `npm audit` reports high issues through `@ducanh2912/next-pwa`, Workbox, Terser, and `serialize-javascript`.
- Impact: PWA dependency chain increases supply-chain risk.
- Fix: upgrade to the fixed major version after testing, or disable/remove PWA if it is not a launch-critical feature.

### [OPTIMIZATION] Debug logging remains in user-facing/runtime code

- File: `D:\rootloom\ecom\components\providers\cart-provider.tsx:193`
- File: `D:\rootloom\ecom\components\admin\media-library.tsx:51`
- File: `D:\rootloom\ecom\components\admin\media-library.tsx:58`
- File: `D:\rootloom\ecom\lib\utils\auth.ts:53`
- Evidence: production code contains raw `console.log`.
- Impact: noisy logs and possible metadata leakage.
- Fix: route logs through `lib/logger.ts` and gate debug logs by environment.

## Service Completeness Assessment

### Payments

- Signature validation exists in `verify-payment` and webhook.
- `verify-payment` correctly calls Razorpay server APIs before order creation.
- `payment.failed` webhook is handled and releases reservations.
- Browser-close during payment is partially handled: webhook can create the order if payment is captured, and `/checkout/failed` can poll `check-payment`.
- Weak spots: address ownership gap, webhook timing-safe comparison, webhook top-level error handling, and manual-review status semantics.

### Inventory

- Online Razorpay inventory is reservation-based with `reserve_stock_batch`, `recover_payment_reservation`, and `release_payment_reservation`.
- Final order commit uses atomic `UPDATE product_variants ... WHERE stock >= qty AND reserved_quantity >= qty`.
- COD uses non-reservation atomic decrement in `create_complete_order`.
- Weak spots: app-level availability checks ignore `reserved_quantity`, and old helper `commit_stock_batch()` uses `GREATEST(0, stock - qty)` in `supabase\migrations\20260226230000_inventory_locking.sql:78`, which would hide oversell if used directly.

### Auth/Admin

- `/admin` layout checks authenticated user and profile role server-side.
- Middleware redirects unauthenticated `/admin` and `/account`.
- Weak spot: `isAdmin()` trusts `user_metadata.role`; fix this before relying on any admin API route.

### Emails

- Order confirmation email is hooked into final order creation via `lib\order-processing.ts:244`.
- Abandoned cart email is hooked into the plural cron route.
- Weak spots: order confirmation email is fire-and-forget in Razorpay success path, and missing Resend config returns `undefined` for order email.

## Recommended Fix Order

1. Upgrade `next` to `13.5.11` minimum and re-run the full suite.
2. Add RLS to `product_waitlist` and `ops_events`.
3. Fix `isAdmin()` to trust DB role/app metadata only, not user metadata.
4. Validate address ownership in Razorpay and COD checkout APIs.
5. Delete or gate `/api/debug/order-fetch`.
6. Harden Razorpay webhook comparison and top-level error handling.
7. Add missing security headers.
8. Consolidate abandoned cart cron.
9. Make transactional email/WhatsApp side effects durable via a jobs table.
10. Remove unused dependencies and generated PWA churn.

## Verification Performed

- `npm run typecheck` passed before this report.
- `npm run lint` passed before this report.
- Targeted payment/cache/callback E2E subset passed before this report: 7/7.
- `npm audit --omit=dev --json` found 21 production dependency vulnerabilities: 2 critical, 11 high, 8 moderate.

