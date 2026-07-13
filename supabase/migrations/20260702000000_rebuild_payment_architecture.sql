ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON public.payments(provider_order_id);

UPDATE public.payments
SET provider_order_id = razorpay_order_id
WHERE provider_order_id IS NULL;

CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT,
  provider_payment_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('failed', 'cancelled')),
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id ON public.payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_order_id ON public.payment_attempts(provider_order_id);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage payment attempts" ON public.payment_attempts;
CREATE POLICY "Admins can manage payment attempts"
  ON public.payment_attempts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inventory_committed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_notified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.create_pending_checkout_order(
  p_user_id UUID,
  p_order_number TEXT,
  p_subtotal NUMERIC,
  p_shipping_cost NUMERIC,
  p_total NUMERIC,
  p_discount_amount NUMERIC,
  p_coupon_code TEXT,
  p_shipping_address_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_variant_id UUID;
  v_quantity INT;
  v_available INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.addresses
    WHERE id = p_shipping_address_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Shipping address does not belong to user';
  END IF;

  INSERT INTO public.orders (
    user_id,
    order_number,
    status,
    payment_status,
    payment_id,
    subtotal,
    shipping_cost,
    total,
    discount_amount,
    coupon_code,
    shipping_address_id
  ) VALUES (
    p_user_id,
    p_order_number,
    'pending',
    'pending',
    NULL,
    p_subtotal,
    p_shipping_cost,
    p_total,
    p_discount_amount,
    p_coupon_code,
    p_shipping_address_id
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INT;

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'Invalid quantity for variant %', v_variant_id;
    END IF;

    SELECT stock - COALESCE(reserved_quantity, 0)
      INTO v_available
      FROM public.product_variants
      WHERE id = v_variant_id
      FOR UPDATE;

    IF v_available IS NULL OR v_available < v_quantity THEN
      RAISE EXCEPTION 'Insufficient available stock for variant %', v_variant_id;
    END IF;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_variant_id,
      v_quantity,
      (v_item->>'price')::NUMERIC
    );
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', p_order_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_paid_order(
  p_order_id UUID,
  p_provider_order_id TEXT,
  p_provider_payment_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_new_stock INT;
  v_coupon_id UUID;
BEGIN
  SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status = 'completed' THEN
    RETURN jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'already_paid', TRUE
    );
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot pay a cancelled order';
  END IF;

  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
  LOOP
    UPDATE public.product_variants
    SET stock = stock - v_item.quantity,
        updated_at = now()
    WHERE id = v_item.variant_id
      AND (stock - COALESCE(reserved_quantity, 0)) >= v_item.quantity
    RETURNING stock INTO v_new_stock;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient available stock for variant %', v_item.variant_id;
    END IF;
  END LOOP;

  IF v_order.coupon_code IS NOT NULL AND btrim(v_order.coupon_code) <> '' THEN
    v_coupon_id := public.apply_coupon_usage_by_code(v_order.coupon_code);
  END IF;

  UPDATE public.orders
  SET status = 'processing',
      payment_status = 'completed',
      payment_id = p_provider_payment_id,
      paid_at = now(),
      inventory_committed_at = COALESCE(inventory_committed_at, now()),
      coupon_usage_counted_at = CASE
        WHEN v_coupon_id IS NOT NULL THEN COALESCE(coupon_usage_counted_at, now())
        ELSE coupon_usage_counted_at
      END,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'already_paid', FALSE
  );
END;
$$;
