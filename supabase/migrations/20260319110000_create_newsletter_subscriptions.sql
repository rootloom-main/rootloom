-- Create Newsletter Subscriptions Table
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow Service Role full access
CREATE POLICY "Service role full access" ON newsletter_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Allow Public Insert
CREATE POLICY "Public can subscribe" ON newsletter_subscriptions
    FOR INSERT WITH CHECK (true);
