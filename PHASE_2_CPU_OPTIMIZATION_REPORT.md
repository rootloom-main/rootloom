# Root & Loom — Phase 2 CPU Optimization Report

**Date:** 2026-11-06  
**Scope:** abandoned-cart cron, WhatsApp broadcast jobs, payment reservation cleanup, admin analytics, and middleware authentication work.  
**Production data/deployment:** No production data was queried or changed; the migration was not applied and no deployment was performed.

## Implemented

### 1. Abandoned-cart and coupon notifications

- Replaced the all-cart read and JavaScript user grouping in `app/api/cron/abandoned-carts/route.ts` with `get_abandoned_cart_reminder_batch`. The database filters by the existing reminder windows (1–6 hours, 6–7 hours, and 24–25 hours), joins profile and Auth email in bulk, aggregates each selected user's cart items, and returns at most 50 users.
- Added an index on `(cart_items.updated_at, user_id)` for the time-window/user grouping access pattern.
- Added `notification_dispatches` and atomic claim/complete functions. Stable keys prevent repeated cart reminders and coupon nudges across cron runs and process restarts; cart reminder keys include the cart's latest update time so a later cart generation remains eligible.
- Replaced up to 500 nested coupon/customer checks with a database query over the existing maximum of five eligible coupons and 100 profiles; cron processes at most 50 pairs each invocation. Existing eligibility windows, coupon cap, and profile cap remain.
- Added Resend's idempotency key to abandoned-cart email requests. WhatsApp provider calls use a durable pre-send claim. Because Twilio's standard Messages API does not document an idempotency key for message creation, an ambiguous claimed send is not automatically retried: this avoids duplicate customer messages and leaves the dispatch record for reconciliation. A known send failure is retained as `failed` and is not hot-looped.

### 2. WhatsApp campaign jobs

- Added persistent campaign recipient snapshots with canonical-phone uniqueness, delivery state, attempts, timestamps, and errors. Recipient lists are generated once from the campaign's existing `all`, `buyers`, or `abandoned_cart` audience rules; `vip` remains empty as before because the previous worker did not implement that audience.
- Campaigns process at most 20 recipients per cron invocation. Compare-and-set claims prevent overlapping jobs from dispatching the same recipient twice. `jobs.progress` stores completed recipient progress and the existing cron frequency is unchanged.
- Added SQL row-lock/`SKIP LOCKED` job claims, a ten-minute worker lease, and recovery of legacy `processing` jobs after a 30-minute migration grace period. The existing jobs and payloads are retained.
- Infrastructure/job failures retry with exponential delay (2, 4, 8 minutes, capped at 30) and stop at the existing `max_attempts`; terminal jobs and campaigns are marked failed, with error details retained.
- If a worker disappears after a recipient is claimed, that recipient becomes `unknown` after its lease expires and is not resent. The campaign/job is marked failed for reconciliation once remaining pending recipients are processed. This deliberately prioritizes the no-duplicate requirement over blind retries when the provider outcome is unknowable.

### 3. Payment reservation cleanup

- `app/api/cron/release-payment-reservations/route.ts` now selects only `id`, `status`, `cart_snapshot`, and `metadata`, orders by expiry, and handles at most 100 rows per run.
- Release still uses the existing transactional `release_payment_reservation` RPC, which locks the payment row and checks reservation state before changing reserved inventory. Released payments stop matching the pending query, so later invocations continue through the remaining backlog without re-releasing valid reservations.
- No cron schedule was changed.

### 4. Admin analytics

- Added `get_admin_analytics_core` to aggregate order totals/statuses, current/previous-period metrics, top products, category distribution, daily sales, distinct cart users, and customer count in SQL.
- Removed full order and cart-user result transfers and the duplicate `order_items` reads from the analytics page. Product and category rollups share one materialized `order_items` aggregate.
- Added a timestamp/status orders index for analytics access. Existing indexes were reviewed in repository migrations; the local database was unavailable for actual `EXPLAIN` plans, so this index and query plan still need staging validation before production apply.

### 5. Middleware

- `middleware.ts` now skips Supabase client creation and `auth.getUser()` when no Supabase auth cookie exists. It preserves the unauthenticated redirect for `/admin`, `/account`, and `/checkout`; auth routes remain unchanged for anonymous requests. Requests carrying Supabase session cookies still run `getUser()` so refresh and validation behavior is preserved.
- No authentication or authorization guard was removed.

### Database migration

`supabase/migrations/20261106000000_cpu_work_queues.sql` adds the durable dispatch and recipient tables, queue fields, RPCs, and indexes. Apply this migration to a staging database, validate the SQL and observed query plans, then deploy the application. The code expects these RPCs/tables to exist; it is not safe to deploy the application before the migration.

## Verification

- `npm run test:unit` — **passed**, 11 tests.
- `npm run typecheck` — **passed**.
- `npm run lint` — **passed** on rerun. The first lint attempt raced with Playwright creating `test-results`; the final run completed successfully.
- `npm run build` — **passed**.
- Chromium local smoke flows — **12 passed** across login UI, unauthenticated account/admin/checkout protections, payment recovery/success surfaces, and cron authorization. These tests did not submit a real payment or send a real notification.
- SQL migration lint / query plans — **not verified**. `supabase db lint --local` could not connect because no local Postgres is listening at `127.0.0.1:54322`; Docker is unavailable in this environment. I did not connect to or mutate a remote database.

## Safety notes and remaining checks

- Twilio's standard Messages resource docs describe message creation but not a create-message idempotency key. The durable claim ensures the app will not submit a second request after an ambiguous first attempt, but it can leave a recipient in `unknown` for manual reconciliation. Do not automatically retry those rows without checking provider logs.
- Coupon nudge failures are persisted and not automatically retried, because the current WhatsApp wrapper returns only a boolean and may also invoke SMS fallback; blindly retrying could duplicate customer notifications.
- Database migrations, RPCs, transaction behavior, and actual query plans need staging execution before production rollout. Verify indexes with `EXPLAIN (ANALYZE, BUFFERS)` against representative staging data and check SQL function permissions/RLS.
- Run authenticated checkout/payment and notification delivery tests against staging with test provider credentials, including concurrent cron invocations, worker crash recovery, and provider timeout cases.
- No claim is made that CPU consumption has decreased. Verify post-deployment Active CPU by route in Vercel Observability and compare against the same traffic period before/after.

## References

- [Twilio Messages resource](https://www.twilio.com/docs/messaging/api/message-resource)
- [Resend idempotency keys](https://resend.com/changelog/idempotency-keys)
- [Vercel Functions usage and pricing](https://vercel.com/docs/functions/usage-and-pricing)
