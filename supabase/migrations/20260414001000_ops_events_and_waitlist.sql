CREATE TABLE IF NOT EXISTS public.ops_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  channel TEXT,
  user_id UUID,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payment_id TEXT,
  reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_events_type_created_at
  ON public.ops_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_events_status_created_at
  ON public.ops_events(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_events_channel_created_at
  ON public.ops_events(channel, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  user_id UUID,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'product_page',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_waitlist_user
  ON public.product_waitlist(product_id, variant_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_waitlist_email
  ON public.product_waitlist(product_id, variant_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_waitlist_phone
  ON public.product_waitlist(product_id, variant_id, phone)
  WHERE phone IS NOT NULL;
