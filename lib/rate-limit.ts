export class RateLimiter {
    private limit: number;
    private window: number;
    private tokens: Map<string, { count: number; expiresAt: number }>;

    constructor(limit: number = 10, window: number = 60 * 1000) {
        this.limit = limit;
        this.window = window;
        this.tokens = new Map();
    }

    check(identifier: string): { success: boolean; limit: number; remaining: number } {
        const now = Date.now();
        const token = this.tokens.get(identifier);

        if (!token || now > token.expiresAt) {
            this.tokens.set(identifier, {
                count: 1,
                expiresAt: now + this.window,
            });
            return { success: true, limit: this.limit, remaining: this.limit - 1 };
        }

        if (token.count >= this.limit) {
            return { success: false, limit: this.limit, remaining: 0 };
        }

        token.count += 1;
        this.tokens.set(identifier, token);
        return { success: true, limit: this.limit, remaining: this.limit - token.count };
    }

    // Cleanup expired tokens to prevent memory leaks
    cleanup() {
        const now = Date.now();
        for (const [key, token] of this.tokens.entries()) {
            if (now > token.expiresAt) {
                this.tokens.delete(key);
            }
        }
    }
}

// Default limiter: 20 requests per minute per IP
export const rateLimiter = new RateLimiter(20, 60 * 1000);
