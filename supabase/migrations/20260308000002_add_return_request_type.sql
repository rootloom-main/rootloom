-- Add request_type to returns table for Refund/Exchange options
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) DEFAULT 'refund';

-- Add check constraint for valid types (optional, but good practice)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_request_type'
    ) THEN
        ALTER TABLE public.returns ADD CONSTRAINT valid_request_type CHECK (request_type IN ('refund', 'exchange'));
    END IF;
END $$;
