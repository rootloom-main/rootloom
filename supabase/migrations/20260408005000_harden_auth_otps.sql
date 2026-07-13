ALTER TABLE public.auth_otps
ADD COLUMN IF NOT EXISTS code_hash TEXT,
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_auth_otps_email_active
ON public.auth_otps(email, created_at DESC)
WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.auth_otp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  event TEXT NOT NULL,
  ip TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auth_otp_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_otp_audit" ON public.auth_otp_audit_log;
CREATE POLICY "service_role_manage_otp_audit" ON public.auth_otp_audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
