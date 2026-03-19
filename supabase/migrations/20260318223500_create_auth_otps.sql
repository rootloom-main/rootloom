-- Create a table to store custom OTPs for email authentication
-- This supports the professional 6-digit OTP flow using Resend SDK

CREATE TABLE IF NOT EXISTS public.auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_auth_otps_email_code ON public.auth_otps(email, code);

-- Enable RLS but keep it private to service role (server-side only)
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;

-- Allow service_role to manage all OTPs
CREATE POLICY "service_role_manage_otps" ON public.auth_otps
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
