# Production Readiness Audit

Audit date: 2026-11-06

## Executive result

**Not production ready until the hosted deployment is resumed and the deployment checks below pass.** The supplied screenshot shows Vercel's “deployment is temporarily paused” page. A HEAD request to `https://rootloom.in` returned HTTP 402 during this audit, which is consistent with a hosting/account state and cannot be repaired by an application code change.

## Findings and changes

### Fixed in this change

1. **Scheduled jobs were running only once per day.** `vercel.json` had a daily schedule for all three jobs. The abandoned-cart route has 1-, 6-, and 24-hour reminder windows, payment reservations expire after 15 minutes, and the job processor processes one job per call. Those cadences were incompatible with daily invocations. Schedules are now hourly for abandoned carts, every 15 minutes for reservation cleanup, and every 5 minutes for queued jobs.
   - **Deployment dependency:** Vercel Hobby only permits once-daily cron schedules; higher frequency schedules require a plan that supports them, otherwise deployment will fail. See [Vercel cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing).
2. **Authentication logs included a full phone number.** The identity-consolidation log now masks all but the last four digits.
3. **There was no unit test command or unit coverage.** Added `npm run test:unit` and tests for production payment-reservation helpers: TTL metadata, item matching, mismatches, expiry, and reservation status.

## Verification

- **PASS** — Unit tests: `npm run test:unit` (4 tests)
- **PASS** — Checkout concurrency simulation: `npm run test:checkout-concurrency` (6 scenarios)
- **PASS** — Launch traffic simulation: `npm run test:launch-traffic` (3 traffic models)
- **PASS** — Admin bundle budget: `npm run check:bundle-budget` (67,450 bytes under 256 KB)
- **PASS** — Type checking: `npm run typecheck`
- **PASS** — Lint: `npm run lint`
- **PASS once** — Production build: `npm run build` completed and listed routes. A later verification build compiled but failed during page data collection because the existing local Next dev server shares the `.next` output directory. The active dev server was left running.
- **PASS** — Browser smoke tests: `npm run test:e2e:smoke` (13 tests, Chromium)

Build warnings observed: stale Browserslist data, and a Node API import in the Upstash Redis Edge bundle. The latter did not prevent the build or smoke tests; review it after deployment against Vercel Edge logs.

## Remaining production gates

- Resume the Vercel project/deployment and confirm the production domain resolves to the latest successful deployment. The HTTP 402 / paused response is outside this repository.
- Confirm the Vercel plan supports the new cron frequencies, then verify all three cron jobs appear in Vercel and their first invocations succeed. Vercel cron schedules are UTC and timing precision depends on plan.
- Confirm production environment variables and Supabase settings in the deployment dashboard; local environment files are intentionally not inspected or included in this report. The local build reported Redis credentials absent. Production rate limiting falls back to per-process memory without Upstash, which is not shared across serverless instances; the setup guide marks both Upstash credentials as required.
- Run a real staging checkout with Razorpay test keys and verify payment webhook delivery, inventory reservation/release, order confirmation email, and refund/return flows. No live money transaction was attempted.
- Database migrations, production Supabase RLS policies, secrets, provider account status, and admin authorization were not independently verified against live services in this local repository audit.

## Scope limits

This is a repository and local build/test audit, not a formal penetration test or a live database/payment certification. The currently accessible domain is paused, so browser behavior against production could not be verified.
