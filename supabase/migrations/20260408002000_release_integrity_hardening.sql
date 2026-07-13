ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS coupon_usage_counted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS coupon_usage_released_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.apply_coupon_usage_by_code(p_coupon_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon_id UUID;
BEGIN
  IF p_coupon_code IS NULL OR btrim(p_coupon_code) = '' THEN
    RETURN NULL;
  END IF;

  UPDATE public.coupons
  SET usage_count = usage_count + 1
  WHERE upper(code) = upper(p_coupon_code)
    AND is_active = true
    AND start_date <= now()
    AND (end_date IS NULL OR end_date >= now())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
  RETURNING id INTO v_coupon_id;

  IF v_coupon_id IS NULL THEN
    RAISE EXCEPTION 'Coupon % is no longer valid', p_coupon_code;
  END IF;

  RETURN v_coupon_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_coupon_usage(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon_code TEXT;
  v_released_at TIMESTAMPTZ;
BEGIN
  SELECT coupon_code, coupon_usage_released_at
  INTO v_coupon_code, v_released_at
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_coupon_code IS NULL OR v_released_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.coupons
  SET usage_count = GREATEST(0, usage_count - 1)
  WHERE upper(code) = upper(v_coupon_code);

  UPDATE public.orders
  SET coupon_usage_released_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;

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
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_new_stock INT;
  v_variant_id UUID;
  v_quantity INT;
  v_coupon_id UUID;
BEGIN
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
          reserved_quantity = reserved_quantity - v_quantity
      WHERE id = v_variant_id
        AND stock >= v_quantity
        AND reserved_quantity >= v_quantity
      RETURNING stock INTO v_new_stock;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved stock unavailable for variant %', v_variant_id;
      END IF;
    ELSE
      UPDATE public.product_variants
      SET stock = stock - v_quantity
      WHERE id = v_variant_id
        AND stock >= v_quantity
      RETURNING stock INTO v_new_stock;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for variant %', v_variant_id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', p_order_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
  p_order_id UUID,
  p_actor_id UUID,
  p_is_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_released_coupon BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT p_is_admin AND v_order.user_id <> p_actor_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_order.status IN ('shipped', 'delivered') THEN
    RAISE EXCEPTION 'Cannot cancel shipped or delivered orders';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('already_cancelled', true);
  END IF;

  FOR v_item IN
    SELECT variant_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    UPDATE public.product_variants
    SET stock = stock + v_item.quantity,
        updated_at = now()
    WHERE id = v_item.variant_id;
  END LOOP;

  IF v_order.coupon_code IS NOT NULL THEN
    v_released_coupon := public.release_order_coupon_usage(p_order_id);
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      refund_status = CASE
        WHEN payment_status = 'completed' AND refund_status <> 'processed' THEN 'requested'
        ELSE refund_status
      END,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'already_cancelled', false,
    'refund_requested', v_order.payment_status = 'completed' AND v_order.refund_status <> 'processed',
    'coupon_released', v_released_coupon
  );
END;
$$;
