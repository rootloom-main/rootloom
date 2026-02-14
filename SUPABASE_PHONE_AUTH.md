# Supabase Phone Auth Configuration Guide

To enable production-ready Phone Auth for Root & Loom, you need to configure Supabase and an SMS provider. Since I cannot access your Supabase dashboard, please follow these exact steps.

## 1. Enable Phone Provider
1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to **Authentication** > **Providers**.
3.  Select **Phone**.
4.  Toggle **Enable Phone** to `ON`.
5.  **SMS Provider**:
    *   For testing/low volume, you can use the default built-in Twilio service (limited).
    *   For **Production (India)**, I highly recommend using **Twilio** or **MSG91**.
    *   *Recommendation*: Start with **Twilio** for ease of use, switch to MSG91 later if costs scale up.

## 2. Twilio Configuration (Recommended)
If you choose Twilio:
1.  Create a [Twilio Account](https://www.twilio.com/).
2.  Get a **Phone Number** capable of SMS.
3.  Copy your `Account SID`, `Auth Token`, and `Message Service SID` (or Phone Number).
4.  In Supabase **Phone** settings:
    *   Select **Twilio** as the provider.
    *   Paste the keys.
    *   Save.

## 3. Important: Security & Cost Control
**Crucial for preventing huge bills from bot attacks:**

1.  **Rate Limits** (In Supabase Auth > Rate Limits):
    *   set `SMS OTPS sent` to **3 per hour** per IP (or similar strict limit).
    *   set `Verify OTPs` to **10 per hour**.
2.  **Captcha** (Optional but recommended):
    *   Enable Turnstile or hCaptcha if you see spam.

## 4. Environment Variables
Ensure your `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
(You likely already have these).

## 5. Testing
Once enabled, you can test with:
*   Real phone numbers (costs money)
*   **Static Test Numbers** (Free):
    *   In Supabase Phone Provider settings, scroll down to "SMS Message".
    *   Look for **"Phone numbers for testing"**.
    *   Add: `+919999999999` with OTP `123456`.
    *   Use this number to test the UI without spending credits.
