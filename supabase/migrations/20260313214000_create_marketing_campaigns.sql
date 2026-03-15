-- Create marketing_campaigns table
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audience_type AS ENUM ('all', 'buyers', 'abandoned_cart', 'vip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status campaign_status DEFAULT 'draft',
    audience_type audience_type DEFAULT 'all',
    message_body TEXT NOT NULL,
    recipient_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    error_log TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin access only
CREATE POLICY "Admins can do everything with campaigns" ON marketing_campaigns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_marketing_campaigns_updated_at
BEFORE UPDATE ON marketing_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_marketing_campaigns_updated_at();

-- RPC for Buyers
CREATE OR REPLACE FUNCTION get_marketing_recipients_buyers()
RETURNS TABLE (full_name TEXT, phone TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.full_name, p.phone
    FROM profiles p
    JOIN orders o ON o.user_id = p.id
    WHERE p.phone IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for Abandoned Carts (users with items in cart but no order in last 24h or similar logic)
-- For simplicity, let's just say users with items in cart_items
CREATE OR REPLACE FUNCTION get_marketing_recipients_abandoned()
RETURNS TABLE (full_name TEXT, phone TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.full_name, p.phone
    FROM profiles p
    JOIN cart_items ci ON ci.user_id = p.id
    WHERE p.phone IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
