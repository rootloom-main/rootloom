ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT;

UPDATE public.profiles
SET referral_code = upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code
ON public.profiles(referral_code)
WHERE referral_code IS NOT NULL;

INSERT INTO public.coupons (
  code,
  discount_type,
  value,
  min_order_value,
  max_discount_amount,
  start_date,
  usage_limit,
  is_active
) VALUES (
  'FIRSTLOOM',
  'percentage',
  10,
  0,
  300,
  now(),
  NULL,
  true
)
ON CONFLICT (code) DO NOTHING;
