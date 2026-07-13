-- Drop the legacy 10-parameter create_complete_order function to resolve function overload ambiguity
DROP FUNCTION IF EXISTS public.create_complete_order(
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
);
