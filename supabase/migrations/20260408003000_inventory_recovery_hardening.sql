-- Atomic recovery/release helpers for Razorpay payment inventory reservations.
-- These functions deliberately lock the payment row before variant rows so cron,
-- webhook, and verify-payment all serialize on the same payment session.

CREATE INDEX IF NOT EXISTS idx_payments_reservation_expires_at
  ON public.payments ((metadata->>'reservation_expires_at'))
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.recover_payment_reservation(
  p_payment_id UUID,
  p_ttl_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_metadata JSONB;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_new_expires_at TIMESTAMPTZ := now() + make_interval(mins => p_ttl_minutes);
  v_item JSONB;
  v_variant_id UUID;
  v_quantity INTEGER;
BEGIN
  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  IF v_payment.status = 'success' THEN
    RETURN jsonb_build_object('status', 'already_committed');
  END IF;

  IF v_payment.cart_snapshot IS NULL OR jsonb_array_length(v_payment.cart_snapshot) = 0 THEN
    RAISE EXCEPTION 'Payment % has no cart snapshot', p_payment_id;
  END IF;

  v_metadata := COALESCE(v_payment.metadata, '{}'::jsonb);
  v_status := v_metadata->>'reservation_status';

  IF v_metadata ? 'reservation_expires_at' THEN
    v_expires_at := (v_metadata->>'reservation_expires_at')::timestamptz;
  END IF;

  -- The reservation is still represented in reserved_quantity. Extend it without
  -- touching variant counts, even if the timestamp is already in the past.
  IF v_status IN ('active', 'recovered') THEN
    UPDATE public.payments
    SET status = 'pending',
        metadata = v_metadata
          || jsonb_build_object(
            'reservation_status', 'active',
            'reservation_expires_at', v_new_expires_at,
            'reservation_recovered_at', now(),
            'reservation_recovery_mode', 'extended_existing'
          ),
        updated_at = now()
    WHERE id = p_payment_id;

    RETURN jsonb_build_object(
      'status', 'extended',
      'previous_expires_at', v_expires_at,
      'reservation_expires_at', v_new_expires_at
    );
  END IF;

  -- The old reservation was already released, so reserve again under row locks.
  FOR v_item IN
    SELECT *
    FROM jsonb_array_elements(v_payment.cart_snapshot)
    ORDER BY (value->>'variant_id')
  LOOP
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    UPDATE public.product_variants
    SET reserved_quantity = reserved_quantity + v_quantity,
        updated_at = now()
    WHERE id = v_variant_id
      AND (stock - reserved_quantity) >= v_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Not enough stock to recover reservation for variant %', v_variant_id;
    END IF;
  END LOOP;

  UPDATE public.payments
  SET status = 'pending',
      metadata = v_metadata
        || jsonb_build_object(
          'reservation_status', 'recovered',
          'reserved_at', now(),
          'reservation_expires_at', v_new_expires_at,
          'reservation_recovered_at', now(),
          'reservation_recovery_mode', 're_reserved_after_release'
        ),
      updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'status', 'recovered',
    'reservation_expires_at', v_new_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_payment_reservation(
  p_payment_id UUID,
  p_reason TEXT DEFAULT 'reservation_expired'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_metadata JSONB;
  v_status TEXT;
  v_item JSONB;
  v_variant_id UUID;
  v_quantity INTEGER;
  v_next_payment_status TEXT;
BEGIN
  SELECT *
  INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  v_metadata := COALESCE(v_payment.metadata, '{}'::jsonb);
  v_status := v_metadata->>'reservation_status';

  IF v_payment.status = 'success' OR v_status = 'committed' THEN
    RETURN jsonb_build_object('released', false, 'status', 'already_committed');
  END IF;

  IF v_status NOT IN ('active', 'recovered') THEN
    RETURN jsonb_build_object('released', false, 'status', COALESCE(v_status, 'none'));
  END IF;

  FOR v_item IN
    SELECT *
    FROM jsonb_array_elements(v_payment.cart_snapshot)
    ORDER BY (value->>'variant_id')
  LOOP
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    UPDATE public.product_variants
    SET reserved_quantity = GREATEST(0, reserved_quantity - v_quantity),
        updated_at = now()
    WHERE id = v_variant_id;
  END LOOP;

  v_next_payment_status := CASE
    WHEN p_reason IN ('payment_failed', 'reservation_expired') THEN 'failed'
    ELSE v_payment.status
  END;

  UPDATE public.payments
  SET status = v_next_payment_status,
      metadata = v_metadata
        || jsonb_build_object(
          'reservation_status', 'released',
          'reservation_released_at', now(),
          'reservation_release_reason', p_reason
        ),
      updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object('released', true, 'status', 'released');
END;
$$;

CREATE OR REPLACE VIEW public.inventory_reservation_reconciliation AS
WITH expected AS (
  SELECT
    (item->>'variant_id')::uuid AS variant_id,
    SUM((item->>'quantity')::integer) AS expected_reserved_quantity
  FROM public.payments p
  CROSS JOIN LATERAL jsonb_array_elements(p.cart_snapshot) item
  WHERE p.status = 'pending'
    AND COALESCE(p.metadata->>'reservation_status', '') IN ('active', 'recovered')
  GROUP BY (item->>'variant_id')::uuid
)
SELECT
  pv.id AS variant_id,
  pv.product_id,
  pv.sku,
  pv.stock,
  pv.reserved_quantity AS actual_reserved_quantity,
  COALESCE(expected.expected_reserved_quantity, 0) AS expected_reserved_quantity,
  pv.reserved_quantity - COALESCE(expected.expected_reserved_quantity, 0) AS reserved_quantity_delta
FROM public.product_variants pv
LEFT JOIN expected ON expected.variant_id = pv.id
WHERE pv.reserved_quantity <> COALESCE(expected.expected_reserved_quantity, 0);
