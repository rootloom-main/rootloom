DROP POLICY IF EXISTS "service_role_manage_otp_audit" ON public.auth_otp_audit_log;
DROP TABLE IF EXISTS public.auth_otp_audit_log;
DROP INDEX IF EXISTS public.idx_auth_otps_email_active;

ALTER TABLE public.auth_otps
DROP COLUMN IF EXISTS consumed_at,
DROP COLUMN IF EXISTS locked_until,
DROP COLUMN IF EXISTS failed_attempts,
DROP COLUMN IF EXISTS code_hash;
