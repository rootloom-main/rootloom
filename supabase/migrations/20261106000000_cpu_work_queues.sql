-- Durable, bounded work for cart notifications, WhatsApp broadcasts, payment
-- cleanup, and the admin analytics aggregates.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;

-- Make jobs left in processing by an older worker recoverable without removing
-- or resetting their attempts/payload.
UPDATE public.jobs
SET locked_until = now() + interval '30 minutes'
WHERE status = 'processing' AND locked_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_ready
  ON public.jobs(next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_jobs_expired_lock
  ON public.jobs(locked_until, created_at)
  WHERE status = 'processing';

CREATE OR REPLACE FUNCTION public.claim_next_job()
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  SELECT id INTO v_job_id
  FROM public.jobs
  WHERE (status = 'pending' AND next_attempt_at <= now())
     OR (status = 'processing' AND locked_until < now())
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.jobs
  SET status = 'processing', locked_until = now() + interval '10 minutes', updated_at = now()
  WHERE id = v_job_id
  RETURNING *;
END;
$$;

CREATE TABLE IF NOT EXISTS public.notification_dispatches (
  idempotency_key TEXT PRIMARY KEY,
  delivery_type TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'dispatching'
    CONSTRAINT notification_dispatch_status_check
    CHECK (status IN ('dispatching', 'sent', 'failed', 'unknown')),
  provider_reference TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_dispatches_user_created
  ON public.notification_dispatches(user_id, created_at DESC);

ALTER TABLE public.notification_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_manage_notification_dispatches" ON public.notification_dispatches;
CREATE POLICY "service_role_manage_notification_dispatches"
  ON public.notification_dispatches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.claim_notification_dispatch(
  p_idempotency_key TEXT,
  p_delivery_type TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_dispatches(idempotency_key, delivery_type, user_id)
  VALUES (p_idempotency_key, p_delivery_type, p_user_id)
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_notification_dispatch(
  p_idempotency_key TEXT,
  p_status TEXT,
  p_provider_reference TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notification_dispatches
  SET status = p_status,
      provider_reference = p_provider_reference,
      error_message = p_error_message,
      completed_at = now()
  WHERE idempotency_key = p_idempotency_key
    AND status = 'dispatching';
$$;

CREATE INDEX IF NOT EXISTS idx_cart_items_updated_user
  ON public.cart_items(updated_at, user_id);

CREATE OR REPLACE FUNCTION public.get_abandoned_cart_reminder_batch(
  p_now TIMESTAMPTZ DEFAULT now(),
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  cart_updated_at TIMESTAMPTZ,
  reminder_tier TEXT,
  dispatch_key TEXT,
  items JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH candidates AS (
    SELECT ci.user_id, max(ci.updated_at) AS last_updated
    FROM public.cart_items ci
    WHERE ci.updated_at > p_now - interval '25 hours'
      AND ci.updated_at < p_now - interval '1 hour'
      AND NOT EXISTS (
        SELECT 1
        FROM public.cart_items recent
        WHERE recent.user_id = ci.user_id
          AND recent.updated_at > p_now - interval '1 hour'
      )
    GROUP BY ci.user_id
  ), eligible AS (
    SELECT c.user_id, c.last_updated,
      CASE
        WHEN c.last_updated > p_now - interval '7 hours'
          AND c.last_updated < p_now - interval '6 hours' THEN '6hr'
        WHEN c.last_updated > p_now - interval '25 hours'
          AND c.last_updated < p_now - interval '24 hours' THEN '24hr'
        ELSE '1hr'
      END AS tier
    FROM candidates c
    WHERE (c.last_updated > p_now - interval '6 hours' AND c.last_updated < p_now - interval '1 hour')
       OR (c.last_updated > p_now - interval '7 hours' AND c.last_updated < p_now - interval '6 hours')
       OR (c.last_updated > p_now - interval '25 hours' AND c.last_updated < p_now - interval '24 hours')
    ORDER BY c.last_updated ASC
  ), keyed AS (
    SELECT e.*,
      'abandoned-cart:' || e.user_id::text || ':' || e.tier || ':' ||
        floor(extract(epoch FROM e.last_updated) * 1000)::bigint::text AS key
    FROM eligible e
  ), unsent AS (
    SELECT k.* FROM keyed k
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notification_dispatches d
      WHERE d.idempotency_key = k.key
    )
  )
  SELECT x.user_id, au.email::text, u.full_name, u.phone, x.last_updated, x.tier, x.key,
    COALESCE(cart.items, '[]'::jsonb)
  FROM unsent x
  LEFT JOIN public.profiles u ON u.id = x.user_id
  JOIN auth.users au ON au.id = x.user_id
  CROSS JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'name', COALESCE(p.name, 'Item'),
      'quantity', ci.quantity,
      'price', COALESCE(p.base_price, 0) + COALESCE(pv.price_adjustment, 0),
      'image', ''
    ) ORDER BY ci.created_at) AS items
    FROM public.cart_items ci
    LEFT JOIN public.products p ON p.id = ci.product_id
    LEFT JOIN public.product_variants pv ON pv.id = ci.variant_id
    WHERE ci.user_id = x.user_id
  ) cart
  WHERE au.email IS NOT NULL
  ORDER BY x.last_updated ASC
  LIMIT greatest(1, least(p_limit, 100));
$$;

CREATE INDEX IF NOT EXISTS idx_coupons_expiring_active
  ON public.coupons(end_date, code)
  WHERE is_active = true AND end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_created
  ON public.profiles(created_at, id)
  WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_whatsapp_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT := regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g');
  v_digits TEXT;
BEGIN
  IF left(v_clean, 1) = '+' THEN
    v_digits := substring(v_clean FROM 2);
  ELSE
    IF left(v_clean, 1) = '0' THEN v_clean := substring(v_clean FROM 2); END IF;
    v_digits := CASE WHEN length(v_clean) = 10 THEN '91' || v_clean ELSE v_clean END;
  END IF;
  IF v_digits !~ '^[0-9]{10,15}$' THEN RETURN NULL; END IF;
  RETURN '+' || v_digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_coupon_expiry_nudge_batch(
  p_now TIMESTAMPTZ DEFAULT now(),
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(user_id UUID, full_name TEXT, phone TEXT, coupon_code TEXT, end_date TIMESTAMPTZ, dispatch_key TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH coupons AS (
    SELECT c.code, c.end_date
    FROM public.coupons c
    WHERE c.is_active = true
      AND c.end_date IS NOT NULL
      AND c.end_date >= p_now
      AND c.end_date <= p_now + interval '48 hours'
    ORDER BY c.end_date ASC
    LIMIT 5
  ), profiles AS (
    SELECT p.id, p.full_name, p.phone
  FROM public.profiles p
    WHERE p.phone IS NOT NULL
    ORDER BY p.created_at ASC, p.id ASC
    LIMIT 100
  ), keyed AS (
    SELECT p.id, p.full_name, p.phone, c.code, c.end_date,
      'coupon-expiry:' || c.code || ':' || COALESCE(public.normalize_whatsapp_phone(p.phone), p.id::text) AS key
    FROM coupons c CROSS JOIN profiles p
  )
  SELECT k.id, k.full_name, k.phone, k.code, k.end_date, k.key
  FROM keyed k
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notification_dispatches d
    WHERE d.idempotency_key = k.key
  )
  ORDER BY k.end_date, k.id
  LIMIT greatest(1, least(p_limit, 100));
$$;

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS recipients_initialized BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  recipient_key TEXT NOT NULL,
  phone TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'unknown')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatch_started_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, recipient_key)
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_ready
  ON public.marketing_campaign_recipients(campaign_id, next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.get_marketing_campaign_recipient_progress(p_campaign_id UUID)
RETURNS TABLE(pending BIGINT, sending BIGINT, unknown BIGINT, sent BIGINT, failed BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE status = 'pending'),
    count(*) FILTER (WHERE status = 'sending'),
    count(*) FILTER (WHERE status = 'unknown'),
    count(*) FILTER (WHERE status = 'sent'),
    count(*) FILTER (WHERE status = 'failed')
  FROM public.marketing_campaign_recipients
  WHERE campaign_id = p_campaign_id;
$$;

ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_manage_campaign_recipients" ON public.marketing_campaign_recipients;
CREATE POLICY "service_role_manage_campaign_recipients"
  ON public.marketing_campaign_recipients FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.initialize_marketing_campaign_recipients(p_campaign_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign public.marketing_campaigns%ROWTYPE;
  v_inserted INTEGER;
BEGIN
  SELECT * INTO v_campaign
  FROM public.marketing_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  IF v_campaign.recipients_initialized THEN
    RETURN v_campaign.recipient_count;
  END IF;

  INSERT INTO public.marketing_campaign_recipients(campaign_id, recipient_key, phone, full_name)
  SELECT p_campaign_id, public.normalize_whatsapp_phone(a.phone), a.phone, a.full_name
  FROM (
    SELECT DISTINCT ON (public.normalize_whatsapp_phone(p.phone)) p.phone, p.full_name
    FROM public.profiles p
    WHERE p.phone IS NOT NULL
      AND public.normalize_whatsapp_phone(p.phone) IS NOT NULL
      AND (
        v_campaign.audience_type::text = 'all'
        OR (v_campaign.audience_type::text = 'buyers' AND EXISTS (
          SELECT 1 FROM public.orders o WHERE o.user_id = p.id
        ))
        OR (v_campaign.audience_type::text = 'abandoned_cart' AND EXISTS (
          SELECT 1 FROM public.cart_items ci WHERE ci.user_id = p.id
        ))
      )
    ORDER BY public.normalize_whatsapp_phone(p.phone), p.created_at ASC, p.id ASC
  ) a
  WHERE v_campaign.audience_type::text IN ('all', 'buyers', 'abandoned_cart')
  ON CONFLICT (campaign_id, recipient_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  UPDATE public.marketing_campaigns
  SET recipients_initialized = true,
      recipient_count = (SELECT count(*)::integer FROM public.marketing_campaign_recipients WHERE campaign_id = p_campaign_id),
      status = 'processing'
  WHERE id = p_campaign_id;

  RETURN (SELECT recipient_count FROM public.marketing_campaigns WHERE id = p_campaign_id);
END;
$$;

CREATE INDEX IF NOT EXISTS idx_orders_created_status
  ON public.orders(created_at, status);

CREATE OR REPLACE FUNCTION public.get_admin_analytics_core(
  p_week_start TIMESTAMPTZ,
  p_previous_week_start TIMESTAMPTZ,
  p_thirty_days_start TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH order_totals AS (
    SELECT
      COALESCE(sum(total) FILTER (WHERE status IS DISTINCT FROM 'cancelled'), 0) AS revenue,
      count(*) FILTER (WHERE status IS DISTINCT FROM 'cancelled') AS order_count,
      count(*) FILTER (WHERE status IN ('pending', 'processing')) AS pending_count,
      count(*) FILTER (WHERE status = 'shipped') AS shipped_count,
      count(*) FILTER (WHERE status = 'delivered') AS delivered_count,
      count(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
      count(*) FILTER (WHERE status = 'refunded') AS refunded_count,
      COALESCE(sum(total) FILTER (WHERE status <> 'cancelled' AND created_at >= p_week_start), 0) AS current_revenue,
      count(*) FILTER (WHERE status <> 'cancelled' AND created_at >= p_week_start) AS current_volume,
      COALESCE(sum(total) FILTER (WHERE status <> 'cancelled' AND created_at >= p_previous_week_start AND created_at < p_week_start), 0) AS previous_revenue,
      count(*) FILTER (WHERE status <> 'cancelled' AND created_at >= p_previous_week_start AND created_at < p_week_start) AS previous_volume,
      count(*) FILTER (WHERE coupon_code IS NOT NULL) AS coupon_orders,
      count(*) FILTER (WHERE coupon_code ILIKE 'REF-%') AS referral_orders,
      count(*) FILTER (WHERE payment_id ILIKE 'COD_%') AS cod_orders
    FROM public.orders
  ), item_rollup AS MATERIALIZED (
    SELECT COALESCE(p.name, 'Unknown Product') AS product_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      sum(oi.quantity)::bigint AS quantity,
      sum(oi.quantity * oi.price) AS revenue
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    GROUP BY COALESCE(p.name, 'Unknown Product'), COALESCE(c.name, 'Uncategorized')
  ), product_sales AS (
    SELECT product_name AS name,
      sum(quantity)::bigint AS quantity,
      sum(revenue) AS revenue
    FROM item_rollup
    GROUP BY product_name
    ORDER BY sum(revenue) DESC
    LIMIT 5
  ), category_sales AS (
    SELECT category_name AS name, sum(revenue) AS value
    FROM item_rollup
    GROUP BY category_name
  ), daily_sales AS (
    SELECT created_at::date AS day, sum(total) AS total
    FROM public.orders
    WHERE status IS DISTINCT FROM 'cancelled' AND created_at >= p_thirty_days_start
    GROUP BY created_at::date
  )
  SELECT jsonb_build_object(
    'orders', (SELECT to_jsonb(order_totals) FROM order_totals),
    'top_products', COALESCE((SELECT jsonb_agg(to_jsonb(product_sales)) FROM product_sales), '[]'::jsonb),
    'category_sales', COALESCE((SELECT jsonb_agg(to_jsonb(category_sales)) FROM category_sales), '[]'::jsonb),
    'daily_sales', COALESCE((SELECT jsonb_object_agg(day::text, total) FROM daily_sales), '{}'::jsonb),
    'abandoned_cart_count', (SELECT count(DISTINCT user_id) FROM public.cart_items),
    'total_customers', (SELECT count(*) FROM public.profiles)
  );
$$;

REVOKE ALL ON FUNCTION public.claim_next_job() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_notification_dispatch(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_notification_dispatch(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_abandoned_cart_reminder_batch(TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_coupon_expiry_nudge_batch(TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_marketing_campaign_recipients(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_marketing_campaign_recipient_progress(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_analytics_core(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_next_job() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_dispatch(TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_notification_dispatch(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_abandoned_cart_reminder_batch(TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_coupon_expiry_nudge_batch(TIMESTAMPTZ, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.initialize_marketing_campaign_recipients(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_marketing_campaign_recipient_progress(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics_core(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
