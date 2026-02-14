-- Add refund tracking columns to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none', 'requested', 'processed', 'rejected')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC DEFAULT 0;

-- Allow admins to update these columns (covered by existing "Admins can update orders" policy)
-- But let's be explicit if needed. Existing policy is:
-- CREATE POLICY "Admins can update orders" ON orders FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
-- So no new policy needed.
