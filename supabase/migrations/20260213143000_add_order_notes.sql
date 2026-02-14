-- Add notes column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Policy "Admins can update orders" already exists in 20260213130000_fix_admin_joins_and_policies.sql
-- No need to recreate it.
