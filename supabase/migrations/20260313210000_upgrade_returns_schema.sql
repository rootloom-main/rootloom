-- Upgrade Returns Table for Production-Grade Flow
-- 1. Add unique constraint to prevent multiple returns for the same item
ALTER TABLE public.returns ADD CONSTRAINT returns_order_item_id_key UNIQUE (order_item_id);

-- 2. Add refund method columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_method') THEN
        CREATE TYPE refund_method AS ENUM ('original_source', 'bank_transfer', 'upi');
    END IF;
END $$;

ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS refund_method refund_method DEFAULT 'original_source';
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS refund_details JSONB; -- Stores bank details or UPI ID

-- 3. Add pickup and admin tracking
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS pickup_tracking_id TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS pickup_status TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Trigger for updated_at
DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
