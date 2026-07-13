CREATE TABLE IF NOT EXISTS public.razorpay_callback_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_callback_nonces_user
ON public.razorpay_callback_nonces(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.redeem_razorpay_callback_nonce(
  p_nonce_hash TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nonce public.razorpay_callback_nonces%ROWTYPE;
BEGIN
  SELECT *
  INTO v_nonce
  FROM public.razorpay_callback_nonces
  WHERE nonce_hash = p_nonce_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Callback nonce not found';
  END IF;

  IF v_nonce.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Callback nonce ownership mismatch';
  END IF;

  IF v_nonce.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Callback nonce has already been used';
  END IF;

  IF v_nonce.expires_at <= now() THEN
    RAISE EXCEPTION 'Callback nonce has expired';
  END IF;

  UPDATE public.razorpay_callback_nonces
  SET consumed_at = now()
  WHERE id = v_nonce.id;

  RETURN v_nonce.payload;
END;
$$;

ALTER TABLE public.razorpay_callback_nonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_razorpay_callback_nonces" ON public.razorpay_callback_nonces;
CREATE POLICY "service_role_manage_razorpay_callback_nonces"
ON public.razorpay_callback_nonces
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
