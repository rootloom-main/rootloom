# Meta Ads Traffic and Vercel Active CPU Analysis

**Analysis date:** 2026-11-06  
**Reported usage:** 4h 8m Fluid Active CPU, stated by the project owner as 99% of team CPU over the previous 30 days  
**Production changes:** None  
**Production data accessed:** None  
**Conclusion confidence:** Insufficient telemetry to attribute CPU to Meta Ads or identify the actual highest-CPU route.

## Executive summary

This investigation cannot establish that Meta Ads contributed to the reported 4h 8m, nor can it establish that they did not. The necessary project-specific Vercel Functions metrics, request logs, Meta Ads campaign history, and analytics exports were not available in the connected workspace. No production requests or user-level records were accessed.

The repository does show how some incoming UTM parameters are captured and identifies routes that could perform substantial server work. These are implementation observations, not proof that the routes were frequently used or consumed CPU during the reported period. In particular, high request volume alone would not establish high Active CPU: Vercel defines Active CPU as time spent executing code and excludes time waiting on database or external network I/O. Route-level Active CPU and invocation metrics from Vercel Observability are needed to identify the actual CPU contributors. [Vercel Fluid Compute pricing](https://vercel.com/docs/functions/usage-and-pricing), [Vercel Observability Insights](https://vercel.com/docs/observability/insights)

The reported 4h 8m is treated as owner-provided context, not independently verified usage. The exact start/end dates and Meta campaign flight dates were not provided. No correlation or causal claim can be made from the available evidence.

## Evidence reviewed

- Repository source in the current working tree, including middleware, search API, product rendering configuration, analytics capture code, cron configuration, and the prior code-level CPU audit.
- Available project files searched for retained access logs, Vercel exports, traffic exports, campaign reports, and analytics exports. None were present.
- Connected integrations were checked for Vercel Observability and Meta/analytics campaign data. These data sources were not connected, so no account metrics could be queried.
- A synthetic traffic simulation exists in `scripts/simulate-launch-traffic.js`; it is an assumption-based model and was excluded as evidence of production traffic.

The local working tree contains other uncommitted optimization changes from the separate Phase 2 work. This report does not treat those local changes as deployed or as representative of all code serving the 30-day period. No application code was edited for this investigation.

## Findings by requested area

| Area | Evidence available | Finding and limitation |
|---|---|---|
| Website traffic patterns | No Vercel request timeseries or analytics export | Total visits, sessions, time-of-day patterns, and before/during campaign changes cannot be measured. |
| Landing-page request volume | `middleware.ts` reads UTM fields and stores them in an HttpOnly `rootloom_attribution` cookie for 14 days | This is request-time attribution capture, not a traffic report. The cookie is client-held and no server-side campaign request ledger was found; it cannot provide historical landing request counts on its own. |
| Most frequently accessed pages | No request logs, pageview export, or Vercel route invocation totals | Top pages cannot be ranked. Source-defined routes do not show their actual popularity. |
| Server-side API invocation frequency | No Observability invocation export or request logs | No endpoint invocation counts or rates are available. The repository inventory in `VERCEL_CPU_OPTIMIZATION_REPORT.md` is code inventory only. |
| Search API usage | `app/api/search/route.ts` validates paging/filter inputs, checks Redis, checks search redirects, and calls `search_products` on cache miss; response includes shared cache headers | Search is a plausible CPU/work candidate on cache misses, especially for high-cardinality queries, but no request or cache-hit rates and no route CPU metrics are available. Database wait may dominate wall time without dominating Active CPU. |
| Product page rendering | `app/product/[slug]/page.tsx` declares `revalidate = 900` (15 minutes) in the code-level audit | Static regeneration can still occur, and request behavior depends on deployment/cache state. No route traffic, cache-hit, render CPU, or campaign landing data is available. The path is a plausible ad landing route only if campaign URLs point there; that was not verified. |
| Cart and checkout APIs | Request-driven route handlers are listed in the prior inventory; payment recovery uses bounded client polling in the code-level audit | No counts by endpoint, campaign source, status, or CPU are available. Checkout activity cannot be inferred from ad clicks. |
| Middleware execution | `middleware.ts` matcher excludes selected Next static/image assets and common image extensions, but matches most other paths. It captures UTM attribution, adds security headers, rate-limits selected routes, and validates Supabase sessions for requests with auth cookies | Middleware can run for many document/API requests, but invocation counts and CPU per execution are unavailable. Current local middleware includes an anonymous-cookie fast path; its deployment date and whether it served the whole analysis window are unknown. No authentication protection was changed. |
| Analytics tracking | `lib/analytics/capture.ts` lazily initializes PostHog when configured; explicit calls include product and checkout-success events | The presence of tracking code does not prove that the key was configured or that events were delivered. No PostHog data was available. Browser analytics events do not by themselves identify server CPU. |
| Bot and crawler traffic | `robots.ts` and feed/sitemap routes define crawl-facing behavior; no request UA logs, bot analytics, or Vercel firewall data were available | Total bot volume and its CPU impact are unknown. `robots.txt` is a crawler policy, not evidence of compliance or traffic. |
| Meta link preview crawlers | No UA/referrer request logs, Meta preview diagnostics, or click/impression exports | Cannot separate link preview fetches from human landing sessions. A preview fetch must not be counted as an ad click or a customer visit without corroborating signals. |
| Search engine crawlers | No verified crawler request records | Cannot distinguish verified search crawlers from clients merely claiming a crawler UA. |
| Repeated source IP or user agent | No raw or pseudonymized request records were available | No repeat-IP or repeat-UA aggregation could be performed. No raw IPs were collected or reported. |
| Campaign traffic spikes | No campaign dates, spend/click time series, or site request time series | No before/during comparison or time correlation can be calculated. The existence of UTM capture is not campaign evidence. |
| Actual high-CPU routes | No Vercel Observability Functions metrics available | Unknown. The code-level hotspots in the prior audit are hypotheses until compared with route-level Active CPU. |

## Route CPU candidates (not measured attribution)

The prior repository audit identifies code paths whose work can grow with traffic volume or data size. They should be compared against Vercel's route-level Active CPU metrics; this list is not ranked by observed CPU:

1. `/api/cron/abandoned-carts` — scheduled hourly; previously audited as scanning cart data and performing recipient lookups. Campaign-driven traffic is not required to trigger it.
2. `/api/cron/process-jobs` — scheduled every five minutes; job and broadcast processing is background work, not evidence of Meta Ads traffic.
3. `/api/cron/release-payment-reservations` — scheduled every fifteen minutes; cleanup execution is unrelated to ad click attribution unless indirectly correlated with increased checkouts.
4. `/admin/analytics` — analytics aggregation work, potentially internal admin traffic.
5. Search API and search page — cache misses and server-side search/facet work could be exercised by customers, crawlers, or automated clients.
6. Product/collection pages, catalog feeds, and sitemaps — cache misses or regeneration can invoke server work, while a CDN cache hit may not invoke the route function in the same way.
7. Middleware — potentially broad request coverage, with additional authenticated session checks on requests carrying Supabase auth cookies.

The cron schedules above are read from `vercel.json`. These routes must be kept separate from Meta-attributed customer traffic in any CPU analysis. The above list should not be interpreted as proof that any one route materially contributed to the 4h 8m.

## Required production comparison

To answer the attribution question, export the same time buckets and exact date range from these sources:

1. **Vercel Observability → Functions:** route/path, invocations, Active CPU (total and where available per-invocation distribution), errors, timestamps, and deployment. Rank by total Active CPU first, then use invocation count and CPU per invocation to explain the result. Include cron routes and middleware/function work distinctly. Vercel's Functions view supports route-level performance inspection. [Vercel Observability Insights](https://vercel.com/docs/observability/insights)
2. **Vercel request/access or firewall logs, if retained:** timestamp, method, normalized path, status, user-agent family, referrer host, cache status, deployment/region, and request/trace ID. Avoid exporting raw IPs. If repeat-source analysis is necessary, aggregate with a keyed, rotating HMAC of the IP at collection time, keep the key separate, and delete the pseudonymized data after the agreed short retention period. Do not use a plain unsalted IP hash.
3. **Meta Ads Manager export:** campaign/ad identifiers, flight dates, daily spend, impressions, outbound/link clicks, destination URL, and available landing-page parameters. Click totals are not equivalent to delivered page requests.
4. **Site analytics export:** daily/hourly sessions and landing pages grouped by `utm_source`, `utm_medium`, `utm_campaign`, plus checkout/conversion outcomes. This requires that the tracker and attribution fields were configured and retained during the relevant period.
5. **Time alignment:** confirm the precise 30-day window and campaign start/end times, normalize all sources to UTC, and compare a matched before period with campaign-active periods. Annotate deployments, cron executions, promotions, and incidents so coincident spikes are not misattributed.

For every route and time bucket, report requests/invocations, total Active CPU, CPU per invocation, cache status, and traffic class. A rise in requests without a corresponding increase in route Active CPU is not evidence that ads drove the CPU consumption. Conversely, a CPU spike in a scheduled cron or admin route should not be credited to ads simply because it overlaps campaign dates.

## Privacy-safe traffic classification

No classification could be performed without request records. When collecting the necessary telemetry, use aggregate classes rather than storing or publishing identifying values:

- **Likely customer traffic:** ordinary browser traffic with campaign/referrer/session evidence, grouped by route and campaign dimensions. Avoid using IP as an identity key.
- **Meta link preview:** classify by verified Meta crawler UA/signals and request behavior; exclude preview fetches from human click/session counts. Do not classify a request as an ad click solely because its UA says Meta.
- **Search crawler:** verify crawler identity using trusted platform guidance or reverse-DNS verification in the logging pipeline; a claimed UA string alone is insufficient.
- **Other automation:** aggregate anomalous rates/patterns into a generic automation category; retain only the minimum diagnostic data needed.
- **Internal admin:** classify authenticated admin route groups separately from public traffic and exclude them from customer landing-page totals. Report only aggregate counts.

Use route templates (for example `/product/[slug]`) rather than full URLs, which may contain search terms, user IDs, tokens, or campaign parameters. Redact query strings except approved campaign keys. Bucket user-agent strings into browser/crawler families. Apply access controls and short retention to any diagnostic logs.

## Recommendations

1. First obtain Vercel route-level Active CPU and invocation exports for the exact 30-day period. Do not optimize routes merely because they receive many requests.
2. Obtain campaign flight dates and a matching Meta Ads click/landing export, plus site analytics with UTM dimensions. Compare daily/hourly shapes after timezone alignment; call this correlation, not causation.
3. If a public route is a measured CPU contributor, compare CDN cache-hit/miss behavior and CPU per invocation, then optimize that measured path without removing product, search, checkout, or attribution behavior.
4. Keep scheduled cron invocations separate in the report. They are scheduled independently of ad traffic and may be a larger workload even during a campaign window.
5. Add privacy-safe route and traffic-class aggregation only if the existing Vercel/analytics data cannot answer the question. Do not add raw IP logging.
6. Re-run the comparison after a full campaign window and after any deployed optimization. Do not claim a reduction until the same Vercel metric and comparable time window verify it.

## Final determination

**Whether Meta Ads contributed to the 4h 8m:** undetermined from available evidence.  
**Most frequent pages/API routes:** unavailable.  
**Routes consuming the most Active CPU:** unavailable; requires Vercel Observability route-level metrics.  
**Customer vs bot, Meta preview, search crawler, and admin split:** unavailable; request classification records were not available.  
**Before/during campaign comparison:** unavailable; campaign dates and aligned traffic/CPU series were not available.  
**Code or production functionality changed in this investigation:** no.
