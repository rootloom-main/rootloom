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

    async check(identifier: string): Promise<{ success: boolean; limit: number; remaining: number }> {
        const now = Date.now();
        const token = this.tokens.get(identifier);

        if (!token || now > token.expiresAt) {
            this.tokens.set(identifier, {
                count: 1,
                expiresAt: now + this.windowMs,
            });
            return { success: true, limit: this.limit, remaining: this.limit - 1 };
        }

        if (token && token.count >= this.limit) {
            return { success: false, limit: this.limit, remaining: 0 };
        }

        token.count += 1;
        this.tokens.set(identifier, token);
        return { success: true, limit: this.limit, remaining: this.limit - token.count };
    }
}

// Memory fallback: 1000 reqs per minute for testing/unblocking
const memoryLimiter = new InMemoryRateLimiter(1000, 60 * 1000);

// Upstash limiter: 1000 reqs per minute Window
const upstashLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "1 m"),
    analytics: true,
}) : null;

export async function checkRateLimit(ip: string) {
    if (upstashLimiter) {
        const result = await upstashLimiter.limit(ip);
        return { success: result.success };
    }
    return await memoryLimiter.check(ip);
}
