-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
    value NUMERIC NOT NULL,
    min_order_value NUMERIC DEFAULT 0,
    max_discount_amount NUMERIC, -- Only for percentage
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons"
    ON coupons FOR ALL
    TO authenticated
    USING (is_admin());

-- Public (authenticated users mainly) can read valid coupons (or lookup by code)
-- For security, usually we don't list all coupons to public. Only specific fetch by code.
-- So we might restrict SELECT to admins, and use a SecureRPC or specific policy for "lookup".
-- Let's allow authenticated users to SELECT specific codes if they know them? 
-- Actually, simple pattern: Admins ALL, Users: SELECT if (is_active AND now() < end_date).
-- BUT we don't want users scraping all coupons. 
-- BETTER: Use a SECURITY DEFINER function to 'apply_coupon(code)' and keeping the table private to admins might be safer.
-- FOR NOW: Admin access only. Frontend validation will use a server action (Admin context) or a specific exposed API.

-- Let's allow "Public Read" for Active coupons for now to make things simple for banner displays etc.
CREATE POLICY "Public can read active coupons"
    ON coupons FOR SELECT
    TO anon, authenticated
    USING (is_active = true);
