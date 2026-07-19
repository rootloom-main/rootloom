import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
    // App
    NEXT_PUBLIC_SITE_URL: z.string().url().optional().default('http://localhost:3000'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    // Email (Resend)
    RESEND_API_KEY: z.string().min(1).optional(),

    // Analytics/Monitoring
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

    // Redis (Upstash)
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // Auth
    OTP_HASH_SECRET: z.string().min(32).optional(),

    // Payments (Razorpay)
    RAZORPAY_KEY_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1).optional(),
    RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),

    // Cron Security
    CRON_SECRET: z.string().min(16).optional(),

    // Twilio (WhatsApp & SMS)
    TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_WHATSAPP_NUMBER: z.string().min(1).optional(),
    TWILIO_MESSAGING_SERVICE_SID: z.string().min(1).optional(),
    TWILIO_DLT_ENTITY_ID: z.string().min(1).optional(),
    TWILIO_DLT_TEMPLATE_ID: z.string().min(1).optional(),
    TWILIO_DLT_TEMPLATE: z.string().min(1).optional(),
    SUPABASE_SMS_HOOK_SECRET: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
