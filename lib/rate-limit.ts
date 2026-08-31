import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

class InMemoryRateLimiter {
    private tokens: Map<string, { count: number; expiresAt: number }> = new Map();
    limit: number;
    windowMs: number;

    constructor(limit: number, windowMs: number) {
        this.limit = limit;
        this.windowMs = windowMs;
    }

    async check(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; retryAfter?: number }> {
        const now = Date.now();
        const token = this.tokens.get(identifier);

        if (!token || now > token.expiresAt) {
            this.tokens.set(identifier, {
                count: 1,
                expiresAt: now + this.windowMs,
            });
            return { success: true, limit: this.limit, remaining: this.limit - 1 };
        }

        if (token.count >= this.limit) {
            const retryAfter = Math.ceil((token.expiresAt - now) / 1000);
            return { success: false, limit: this.limit, remaining: 0, retryAfter };
        }

        token.count += 1;
        this.tokens.set(identifier, token);
        return { success: true, limit: this.limit, remaining: this.limit - token.count };
    }
}

// In-Memory Fallbacks when Redis is not connected
const memoryIpOtpLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000); // 5 OTPs / 15 mins / IP
const memoryPhone15mLimiter = new InMemoryRateLimiter(3, 15 * 60 * 1000); // 3 OTPs / 15 mins / Phone
const memoryPhone1hLimiter = new InMemoryRateLimiter(5, 60 * 60 * 1000); // 5 OTPs / 1 hour / Phone
const memoryPhoneCooldownLimiter = new InMemoryRateLimiter(1, 60 * 1000); // 60s cooldown / Phone
const memoryVerifyLimiter = new InMemoryRateLimiter(5, 15 * 60 * 1000); // 5 verify attempts / 15 mins

// Upstash Redis Limiters
const redisIpOtpLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:otp:ip',
    analytics: true,
}) : null;

const redisPhone15mLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '15 m'),
    prefix: 'rl:otp:phone:15m',
    analytics: true,
}) : null;

const redisPhone1hLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:otp:phone:1h',
    analytics: true,
}) : null;

const redisPhoneCooldownLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, '60 s'),
    prefix: 'rl:otp:cooldown',
    analytics: true,
}) : null;

const redisVerifyLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:otp:verify',
    analytics: true,
}) : null;

/**
 * 1. Resend OTP 60-Second Cooldown Check
 * Prevents rapid button clicking for the same phone/email.
 */
export async function checkOtpCooldown(identifier: string): Promise<{ success: boolean; error?: string }> {
    const key = `cooldown:${identifier.toLowerCase()}`;
    if (redisPhoneCooldownLimiter) {
        const res = await redisPhoneCooldownLimiter.limit(key);
        if (!res.success) {
            return { success: false, error: 'Please wait 60 seconds before requesting another OTP.' };
        }
        return { success: true };
    }
    const memRes = await memoryPhoneCooldownLimiter.check(key);
    if (!memRes.success) {
        return { success: false, error: 'Please wait 60 seconds before requesting another OTP.' };
    }
    return { success: true };
}

/**
 * 2. Per-Phone/Contact Limit:
 * - Max 3 OTPs / 15 minutes
 * - Max 5 OTPs / 1 hour
 */
export async function checkPhoneOtpRateLimit(phoneOrEmail: string): Promise<{ success: boolean; error?: string }> {
    const key = phoneOrEmail.toLowerCase().trim();

    // Check 15-minute window (Max 3)
    if (redisPhone15mLimiter) {
        const res15m = await redisPhone15mLimiter.limit(key);
        if (!res15m.success) {
            return {
                success: false,
                error: 'Too many OTP requests for this number. Maximum 3 requests per 15 minutes. Please try again later.',
            };
        }
    } else {
        const mem15m = await memoryPhone15mLimiter.check(`15m:${key}`);
        if (!mem15m.success) {
            return {
                success: false,
                error: 'Too many OTP requests for this number. Maximum 3 requests per 15 minutes. Please try again later.',
            };
        }
    }

    // Check 1-hour window (Max 5)
    if (redisPhone1hLimiter) {
        const res1h = await redisPhone1hLimiter.limit(key);
        if (!res1h.success) {
            return {
                success: false,
                error: 'Hourly OTP limit reached for this number (5 OTPs/hour). Please try again after some time.',
            };
        }
    } else {
        const mem1h = await memoryPhone1hLimiter.check(`1h:${key}`);
        if (!mem1h.success) {
            return {
                success: false,
                error: 'Hourly OTP limit reached for this number (5 OTPs/hour). Please try again after some time.',
            };
        }
    }

    return { success: true };
}

/**
 * 3. Per-IP Limit:
 * - Max 5 OTP requests / 15 minutes / IP
 * Protects endpoint against attackers cycling through different numbers.
 */
export async function checkIpOtpRateLimit(ip: string): Promise<{ success: boolean; error?: string }> {
    const cleanIp = ip.trim();
    if (redisIpOtpLimiter) {
        const res = await redisIpOtpLimiter.limit(cleanIp);
        if (!res.success) {
            return {
                success: false,
                error: 'Too many OTP requests from your network. Please wait 15 minutes.',
            };
        }
        return { success: true };
    }
    const memRes = await memoryIpOtpLimiter.check(cleanIp);
    if (!memRes.success) {
        return {
            success: false,
            error: 'Too many OTP requests from your network. Please wait 15 minutes.',
        };
    }
    return { success: true };
}

/**
 * Generic Rate Limit (for backward compatibility)
 */
export async function checkRateLimit(key: string) {
    return checkIpOtpRateLimit(key);
}
