DELETE FROM public.coupons WHERE code = 'FIRSTLOOM';
DROP INDEX IF EXISTS public.idx_profiles_referral_code;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code;
