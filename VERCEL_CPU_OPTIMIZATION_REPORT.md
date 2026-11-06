# Root & Loom Vercel CPU Optimization Report

**Audit date:** 2026-11-06  
**Scope:** Next.js App Router, middleware, server rendered pages, polling, cron jobs, database work, feeds, integrations, and image/PDF processing.  
**Production data:** Not accessed or modified.  
**Deployment:** No production deployment performed.

## Executive summary

The repository contains several code paths that can scale their work with catalog, order, cart, or campaign size. The highest-risk candidates are the abandoned-cart cron, WhatsApp broadcast jobs, payment reservation cleanup, and admin analytics. Search and collection pages also repeat large reads and server rendering. Middleware performs verified Supabase user validation on every matched request, including public routes.

These are code-level candidates, not a confirmed attribution of the reported 4h 8m. Project-specific Vercel route CPU metrics were not available during this audit. Vercel Active CPU measures time spent executing function code and excludes time waiting on database or external network I/O, so request volume and wall duration alone cannot identify the CPU-heavy route. Confirm the primary route(s) in Vercel Observability, sorted by Active CPU and invocations, before making larger data-flow changes.

## Findings

Severity describes potential impact if the route is invoked frequently or its data volume grows. CPU impact is qualitative because production route metrics and database cardinalities were not available.

| Location and function | Root cause / potential CPU impact | Severity | Recommended solution |
|---|---|---:|---|
| `app/api/cron/abandoned-carts/route.ts` — `GET` | Reads every `cart_items` row and builds a full in-memory `Map`; then sequentially queries profile and Auth for each old cart owner. Work grows with all cart rows and eligible users. | Critical | Filter/group eligible carts in indexed SQL/RPC and process bounded, resumable batches; bulk-load recipient details and retain per-reminder idempotency. |
| `app/api/cron/abandoned-carts/route.ts` — `sendCouponExpiryNudges` | Up to 5 coupons × 100 profiles are checked sequentially and may invoke WhatsApp sends each run. Redis absence also removes dedupe protection. | High | Use a persistent idempotency record, query only eligible recipients, and bound work per invocation. Preserve campaign rules and delivery retries. |
| `lib/jobs.ts` — `processNextJob` | Broadcast audience is fetched without a limit and processed with a sequential per-recipient loop in one cron invocation. Failed jobs can return to pending and retry every cron interval without backoff. | Critical | Batch/checkpoint audience processing; add bounded invocation work and retry backoff/terminal handling without dropping pending campaign work. |
| `app/api/cron/release-payment-reservations/route.ts` — `GET` | Loads every expired pending payment using `select('*')` and processes all results sequentially without a limit. Backlog size can make a single invocation unbounded. | High | Select only needed fields, cap each batch, and let later cron runs continue. |
| `middleware.ts` — `middleware` | Supabase client setup and `auth.getUser()` run on every matched request. The verified user is required for protected route redirects and signed-in auth-page redirects, but public pages and most API requests do not use it for routing. | High | Measure middleware CPU/invocations. If optimizing, limit validation only after validating Supabase cookie refresh semantics and preserving admin/account/checkout/auth guards. |
| `app/admin/analytics/page.tsx` — `AdminAnalyticsPage` | Loads all orders and order items, loads order items again for category metrics, and loads all cart user IDs; several full result sets are aggregated in JS on each page render. | High | Move aggregates to DB-side indexed queries/RPCs; consolidate repeated scans and avoid transferring full histories when the metric can be calculated in SQL. Keep the same metric definitions. |
| `app/search/page.tsx` — `SearchPage` | Each search render queries categories and four full product/variant facet result sets, then deduplicates/sorts in JS before the search RPC. Empty-result paths add spelling/recommendation reads; each nonempty query also starts an admin analytics write. | High | Cache public facet data with a bounded TTL and batch analytics writes. Preserve personalized result policies and search semantics. |
| `app/collections/page.tsx` — `CollectionsIndexPage` | Public index is `force-dynamic`, `revalidate = 0`, and selects every active collection per request. | Medium–High | Cache public collection data only after confirming it is independent of cookies/user state; add a suitable revalidation interval. |
| `app/collections/[slug]/page.tsx` — `CollectionContent`, `generateMetadata` | Detail route is also forced dynamic. Collection metadata and content issue separate collection reads; manually curated product lists are not limited, while automated lists are limited to 60. | Medium–High | Reuse collection data where framework-safe, cache public results, and bound/paginate manual product lists without removing products from the user experience. |
| `components/admin/notification-panel.tsx` + `app/api/admin/notifications/route.ts` — `NotificationPanel`, `GET` | Two-minute polling continues while admin tabs are hidden; every call authenticates and runs three DB queries. | Medium | Pause polling in hidden tabs and refresh on visibility return. Implemented in this change; visible-tab behavior is retained. |
| `app/api/feeds/google-merchant/route.ts` — `GET` | On a cache miss, reads all active products with nested variants/images and builds XML strings in nested loops. One-hour shared cache headers reduce repeat work when cache hits. | Medium | Preserve shared caching; check cache-hit and bot traffic metrics. Paginate/stream only if feed size and route CPU justify it. |
| `app/api/feed.xml/route.ts`, `app/image-sitemap.xml/route.ts` — `GET` | Full catalog reads and in-memory XML/sitemap mapping on cache misses; both set one-hour shared cache headers. | Medium | Verify Vercel cache behavior and bot traffic; avoid expensive rebuilds on cache misses if observed in route metrics. |
| `app/api/search/route.ts` — `GET` | Uses Redis and shared response caching, but query text is not length-limited and becomes part of a cache key. Unique long bot queries can bypass cache and call the search RPC. | Medium | Apply a reasonable input-length bound and normalized cache key after confirming product search limits. |
| `app/checkout/failed/page.tsx` — payment status effect | Payment recovery polls every two seconds for up to six attempts. It is bounded and user-triggered but can invoke the status function multiple times per visit. | Low–Medium | Retain status verification; tune backoff only if checkout recovery UX and reconciliation latency support it. |
| `components/search/smart-search.tsx`, `components/search/search-overlay.tsx` — placeholder effects | Both rotate placeholder copy every three seconds. This is browser CPU, not Vercel Fluid Active CPU. Autocomplete has a debounce and aborts stale requests, although already-received server requests may still complete. | Low | No Fluid CPU change indicated. Avoid changing search UX without browser profiling. |
| `app/api/admin/orders/[id]/invoice/route.ts` — invoice handler | Admin-triggered invoice generation contains loops and PDF/browser tooling dependencies. It is not an observed background loop; CPU impact depends on invoice size and invocation count. | Low–Medium | Inspect route CPU only if Vercel metrics show it as a contributor; keep PDF generation behavior intact. |

### API and server function inventory

All 26 `app/api/**/route.ts` handlers and the two additional App Router handlers were inventoried:

- **Admin:** `/api/admin/invoice-templates`, `/api/admin/invoice-templates/[id]`, `/api/admin/invoice-templates/[id]/versions`, `/api/admin/invoice-templates/[id]/versions/[versionId]/restore`, `/api/admin/notifications`, `/api/admin/orders/[id]/invoice`, `/api/admin/orders/[id]/label`.
- **Auth:** `/auth/callback`, `/api/auth/sms-provider`.
- **Checkout/contact:** `/api/checkout/cod`, `/api/checkout/validate`, `/api/contact`.
- **Cron:** `/api/cron/abandoned-carts`, `/api/cron/process-jobs`, `/api/cron/release-payment-reservations`.
- **Feeds:** `/api/feed.xml`, `/api/feeds/google-merchant`, `/image-sitemap.xml`.
- **Payments:** `/api/payments/checkout`, `/api/payments/failure`, `/api/payments/status`, `/api/payments/verify`, `/api/payments/webhook`.
- **Search:** `/api/search`, `/api/search/click`.
- **User:** `/api/user/returns`, `/api/user/returns/evidence`, `/api/waitlist`.

The remaining handlers are request-driven in their design. The code search did not find a general server-side `setInterval`, recursive handler, or obvious unbounded `while` loop. Timer matches outside the notification poll are browser-side OTP/auth countdowns, delayed UI actions, and bounded payment recovery polling. Search autocomplete is debounced. No continuously running image-processing task was found; image/PDF packages are used by request-triggered/admin flows.

## Optimization completed

### Admin notification polling

Changed `components/admin/notification-panel.tsx` to use `lib/utils/visible-polling.ts`. It fetches immediately when visible, continues the existing two-minute interval while visible, stops its interval when hidden, and refreshes immediately when the tab becomes visible again. Cleanup removes the listener and timer on unmount. This avoids periodic notification API calls from backgrounded admin tabs while preserving active-page freshness.

No production data, API behavior, cron schedule, campaign delivery, payment processing, or access control was changed.

## Verification

- `npm run test:unit` — **passed**, 6 tests (including visible/hidden polling transitions and cleanup).
- `npm run typecheck` — **passed**.
- `npm run lint` — **passed**.
- Production build and browser-based end-to-end flows were not run as part of this scoped optimization.

## Priority plan

1. In Vercel Observability, sort Functions by Active CPU and invocations, and correlate the top routes with request paths and deployment traffic. Vercel's metric excludes network/database wait time.
2. If cron routes rank highly, implement bounded batches and durable progress/idempotency for abandoned cart and broadcast processing; review retry/backoff and Redis-unavailable behavior.
3. If analytics/search rank highly, move heavy aggregations/facets into indexed DB queries or safely cached public data. Compare output against current metric/search semantics.
4. If middleware ranks highly, test auth refresh and route protection in staging before narrowing `getUser()` scope.
5. Confirm feed cache hit rates and bot traffic. Keep the existing public cache headers and tune based on measured misses.
6. Recheck route CPU after deployment and compare the same 30-day or post-deploy time window.

## Limits and references

This audit had no access to the project's Vercel Observability data, live database query plans/cardinalities, or production traffic breakdown. Findings therefore identify code-proven scaling patterns, not a measured per-route CPU attribution. Vercel's guidance describes Active CPU as execution time excluding waits for external I/O and recommends reviewing function metrics by route and invocation volume:

- [Vercel Functions usage and pricing](https://vercel.com/docs/functions/usage-and-pricing)
- [Understanding the cost impact of function invocations](https://vercel.com/kb/guide/understand-cost-impact-of-function-invocations)
