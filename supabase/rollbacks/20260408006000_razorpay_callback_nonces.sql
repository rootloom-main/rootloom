DROP POLICY IF EXISTS "service_role_manage_razorpay_callback_nonces" ON public.razorpay_callback_nonces;
DROP FUNCTION IF EXISTS public.redeem_razorpay_callback_nonce(TEXT, UUID);
DROP TABLE IF EXISTS public.razorpay_callback_nonces;
