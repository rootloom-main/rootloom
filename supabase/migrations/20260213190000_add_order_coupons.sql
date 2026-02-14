-- Add coupon columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- RPC to increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET usage_count = usage_count + 1
  WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
