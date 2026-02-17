CREATE OR REPLACE FUNCTION create_complete_order(
  p_user_id UUID,
  p_order_number TEXT,
  p_payment_id TEXT,
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
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_new_stock INT;
  v_variant_id UUID;
  v_quantity INT;
BEGIN
  -- 1. Insert Order
  INSERT INTO orders (
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
    'processing',
    'completed',
    p_payment_id,
    p_subtotal,
    p_shipping_cost,
    p_total,
    p_discount_amount,
    p_coupon_code,
    p_shipping_address_id
  )
  RETURNING id INTO v_order_id;

  -- 2. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_quantity := (v_item->>'quantity')::INT;

    -- Insert Order Item
    INSERT INTO order_items (
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

    -- Update Stock
    UPDATE product_variants
    SET stock = stock - v_quantity
    WHERE id = v_variant_id
    RETURNING stock INTO v_new_stock;

    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for variant %', v_variant_id;
    END IF;
  END LOOP;

  -- Return Result
  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', p_order_number
  );
END;
$$;
