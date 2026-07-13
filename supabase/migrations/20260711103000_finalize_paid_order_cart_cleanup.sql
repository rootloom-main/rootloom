DROP FUNCTION IF EXISTS public.finalize_paid_order(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.finalize_paid_order(
  p_order_id UUID,
  p_provider_order_id TEXT,
  p_provider_payment_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_cart_item_ids UUID[] DEFAULT '{}'::UUID[],
  p_purchased_product_ids UUID[] DEFAULT '{}'::UUID[],
  p_purchased_variant_ids UUID[] DEFAULT '{}'::UUID[]
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
  v_cart_removed_count INT := 0;
BEGIN
  SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_user_id IS NOT NULL AND v_order.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Order does not belong to user';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot pay a cancelled order';
  END IF;

  IF v_order.payment_status <> 'completed' THEN
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
        paid_at = COALESCE(paid_at, now()),
        inventory_committed_at = COALESCE(inventory_committed_at, now()),
        coupon_usage_counted_at = CASE
          WHEN v_coupon_id IS NOT NULL THEN COALESCE(coupon_usage_counted_at, now())
          ELSE coupon_usage_counted_at
        END,
        updated_at = now()
    WHERE id = p_order_id;
  END IF;

  WITH purchased AS (
    SELECT oi.product_id, oi.variant_id
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
    UNION
    SELECT unnest(p_purchased_product_ids), NULL::UUID
    WHERE cardinality(p_purchased_product_ids) > 0
    UNION
    SELECT NULL::UUID, unnest(p_purchased_variant_ids)
    WHERE cardinality(p_purchased_variant_ids) > 0
  ),
  removed AS (
    DELETE FROM public.cart_items ci
    WHERE ci.user_id = COALESCE(p_user_id, v_order.user_id)
      AND (
        (cardinality(p_cart_item_ids) > 0 AND ci.id = ANY(p_cart_item_ids))
        OR ci.variant_id IN (
          SELECT variant_id FROM purchased WHERE variant_id IS NOT NULL
        )
        OR ci.product_id IN (
          SELECT product_id FROM purchased WHERE product_id IS NOT NULL
        )
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_cart_removed_count FROM removed;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'already_paid', v_order.payment_status = 'completed',
    'cart_removed_count', v_cart_removed_count
  );
END;
$$;

DROP FUNCTION IF EXISTS public.create_complete_order(
  UUID,
  TEXT,
  TEXT,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  TEXT,
  UUID,
  JSONB,
  TEXT,
  TEXT,
  BOOLEAN
);

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
  p_require_reservation BOOLEAN DEFAULT FALSE,
  p_cart_item_ids UUID[] DEFAULT '{}'::UUID[],
  p_cleanup_purchased_cart_items BOOLEAN DEFAULT FALSE
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
  v_cart_removed_count INT := 0;
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

  IF p_cleanup_purchased_cart_items THEN
    WITH purchased AS (
      SELECT oi.product_id, oi.variant_id
      FROM public.order_items oi
      WHERE oi.order_id = v_order_id
    ),
    removed AS (
      DELETE FROM public.cart_items ci
      WHERE ci.user_id = p_user_id
        AND (
          (cardinality(p_cart_item_ids) > 0 AND ci.id = ANY(p_cart_item_ids))
          OR ci.variant_id IN (
            SELECT variant_id FROM purchased WHERE variant_id IS NOT NULL
          )
          OR ci.product_id IN (
            SELECT product_id FROM purchased WHERE product_id IS NOT NULL
          )
        )
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_cart_removed_count FROM removed;
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', p_order_number,
    'cart_removed_count', v_cart_removed_count
  );
END;
$$;
