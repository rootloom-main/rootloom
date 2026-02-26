-- Enterprise Phase 5: B2B Wholesale Pricing Tiers
-- Adds pricing_tier to profiles and wholesale_discount_percentage to products

-- 1. Add pricing tier enum to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_tier_enum') THEN
    CREATE TYPE pricing_tier_enum AS ENUM ('retail', 'wholesale', 'distributor');
  END IF;
END$$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pricing_tier text DEFAULT 'retail'
  CHECK (pricing_tier IN ('retail', 'wholesale', 'distributor'));

-- 2. Add wholesale discount percentage to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wholesale_discount_pct decimal(5,2) DEFAULT 0;

-- 3. Add distributor discount percentage to products (deeper tier)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS distributor_discount_pct decimal(5,2) DEFAULT 0;

-- 4. Index for fast tier-based filtering
CREATE INDEX IF NOT EXISTS idx_profiles_pricing_tier ON profiles(pricing_tier);

-- 5. RLS: Users can read their own pricing_tier via existing profile policies
-- No additional RLS needed since profiles already have user-scoped policies

-- 6. Helper function to calculate tiered price
CREATE OR REPLACE FUNCTION get_tiered_price(
  p_base_price decimal,
  p_wholesale_discount decimal,
  p_distributor_discount decimal,
  p_tier text
)
RETURNS decimal AS $$
BEGIN
  IF p_tier = 'distributor' AND p_distributor_discount > 0 THEN
    RETURN p_base_price * (1 - p_distributor_discount / 100);
  ELSIF p_tier = 'wholesale' AND p_wholesale_discount > 0 THEN
    RETURN p_base_price * (1 - p_wholesale_discount / 100);
  ELSE
    RETURN p_base_price;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
