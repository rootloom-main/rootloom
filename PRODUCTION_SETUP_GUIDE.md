# Root & Loom: Production Setup Guide 🚀

Follow these steps to transition from local development to a live production environment.

## 1. Environment Variables (Critical)
Ensure the following variables are set in your production environment (e.g., Vercel Dashboard). **Do not use placeholders.**

### Authentication (Supabase)
- `NEXT_PUBLIC_SUPABASE_URL`: Your live Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your live Supabase Anonymous Key.
- `SUPABASE_SERVICE_ROLE_KEY`: Your live Supabase Service Role Key (Keep Private!).

### Payments (Razorpay)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Your **Live** Razorpay Key ID (starts with `rzp_live_`).
- `RAZORPAY_KEY_SECRET`: Your **Live** Razorpay Key Secret.
- `RAZORPAY_WEBHOOK_SECRET`: The secret you set in Razorpay Dashboard > Settings > Webhooks.

### Communication
- `RESEND_API_KEY`: Your Production Resend API Key.
- `RESEND_FROM_ADDRESS`: `Root & Loom <root@rootloom.in>` (Ensure your domain is verified in Resend).
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`: For WhatsApp order notifications.

### Infrastructure
- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis URL (required for production rate limiting).
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis Token.

---

## 2. Supabase Configuration

### Database
Ensure you have run the following SQL in your Supabase SQL Editor:
```sql
-- Newsletter Table
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

-- Allow Public Insert (Optionally add rate limiting logic here)
CREATE POLICY "Public can subscribe" ON newsletter_subscriptions
    FOR INSERT WITH CHECK (true);
```

### Authentication
1.  **Site URL**: Update `Auth > Configuration > Site URL` to `https://rootloom.in`.
2.  **Redirect URLs**: Add `https://rootloom.in/auth/callback` to the allow list.

---

## 3. Razorpay Webhook Setup
1.  Go to **Razorpay Dashboard > Settings > Webhooks**.
2.  Add a new Webhook:
    - **URL**: `https://rootloom.in/api/razorpay/webhook`
    - **Secret**: (Set a strong random string and copy it to `RAZORPAY_WEBHOOK_SECRET`)
    - **Events**: Select `payment.captured` and `payment.failed`.

---

## 4. Auth & Security (Spam Protection)
To prevent OTP/SMS spam in production, adjust these settings in **Supabase Dashboard**:

### Rate Limits
1.  Go to **Settings > Authentication > Rate Limits**.
2.  **Email OTP**: Set a reasonable limit (e.g., 3-5 requests per hour per IP).
3.  **SMS OTP**: If using SMS, set strict limits as these cost money.

### CAPTCHA (Recommended)
Consider enabling **hCaptcha** in Supabase Authentication settings to prevent bot-driven OTP requests.

---

## 5. Final Verification
- [ ] **Middleware**: I've hardened the session refresh logic. Verify by staying logged in for over 1 hour.
- [ ] **Newsletter**: Test a subscription. If it fails, ensure you ran the SQL in **Section 2**.
- [ ] **Checkout**: Perform a test purchase using a real payment method.
- [ ] **Emails**: Verify Resend is sending from your verified domain.

**Support**: For technical issues, contact the development team.
