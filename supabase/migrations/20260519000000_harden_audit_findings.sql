ALTER TABLE public.ops_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ops events" ON public.ops_events;
CREATE POLICY "Admins can read ops events"
  ON public.ops_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage ops events" ON public.ops_events;
CREATE POLICY "Admins can manage ops events"
  ON public.ops_events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read own waitlist entries" ON public.product_waitlist;
CREATE POLICY "Users can read own waitlist entries"
  ON public.product_waitlist
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join waitlist as self" ON public.product_waitlist;
CREATE POLICY "Users can join waitlist as self"
  ON public.product_waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own waitlist entries" ON public.product_waitlist;
CREATE POLICY "Users can update own waitlist entries"
  ON public.product_waitlist
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage waitlist" ON public.product_waitlist;
CREATE POLICY "Admins can manage waitlist"
  ON public.product_waitlist
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read payments" ON public.payments;
CREATE POLICY "Admins can read payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.create_complete_order(
  p_user_id UUID,
  p_order_number TEXT,
  p_payment_id TEXT,
  p_subtotal NUMERIC,
  p_shipping_cost NUMERIC,
  p_total NUMERIC,
  p_discount_amount NUMERIC,
  p_coupon_code TEXT,
  p_shipping_address_id UUID,
  p_items JSONB,
  p_order_status TEXT DEFAULT 'processing',
  p_payment_status TEXT DEFAULT 'completed',
  p_require_reservation BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_new_stock INT;
  v_variant_id UUID;
  v_quantity INT;
  v_coupon_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.addresses
    WHERE id = p_shipping_address_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Shipping address does not belong to user';
  END IF;

  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    v_coupon_id := public.apply_coupon_usage_by_code(p_coupon_code);
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
    shipping_address_id,
    coupon_usage_counted_at,
    coupon_usage_released_at
  ) VALUES (
    p_user_id,
    p_order_number,
    p_order_status,
    p_payment_status,
    p_payment_id,
    p_subtotal,
    p_shipping_cost,
    p_total,
    p_discount_amount,
    p_coupon_code,
    p_shipping_address_id,
    CASE WHEN v_coupon_id IS NOT NULL THEN now() ELSE NULL END,
    NULL
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INT;

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'Invalid quantity for variant %', v_variant_id;
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

    IF p_require_reservation THEN
      UPDATE public.product_variants
      SET stock = stock - v_quantity,
          reserved_quantity = GREATEST(0, reserved_quantity - v_quantity),
          updated_at = now()
      WHERE id = v_variant_id
        AND stock >= v_quantity
        AND reserved_quantity >= v_quantity
      RETURNING stock INTO v_new_stock;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved stock unavailable for variant %', v_variant_id;
      END IF;
    ELSE
      UPDATE public.product_variants
      SET stock = stock - v_quantity,
          updated_at = now()
      WHERE id = v_variant_id
        AND (stock - COALESCE(reserved_quantity, 0)) >= v_quantity
      RETURNING stock INTO v_new_stock;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient available stock for variant %', v_variant_id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', p_order_number
  );
END;
$$;
