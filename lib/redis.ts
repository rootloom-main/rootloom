import { Redis } from '@upstash/redis/cloudflare';
import { logger } from './logger';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const createRedisClient = () => {
    if (!redisUrl || !redisToken || !redisUrl.startsWith('https://')) {
        logger.info('Redis credentials not found or invalid, caching will be disabled.');
        return null;
    }

    try {
        return new Redis({
            url: redisUrl,
            token: redisToken,
        });
    } catch (e) {
        logger.warn('Failed to create Redis client, caching disabled.');
        return null;
    }
};

export const redis = createRedisClient();

function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) =>
            setTimeout(() => {
                logger.warn(`Redis operation timed out after ${ms}ms`);
                resolve(fallbackValue);
            }, ms)
        ),
    ]);
}

export async function getCache<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
        return await withTimeout(redis.get<T>(key), 150, null);
    } catch (error) {
        logger.error('Redis Get Error', { key, error });
        return null;
    }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300) {
    if (!redis) return;
    try {
        await withTimeout(redis.set(key, value, { ex: ttlSeconds }), 150, undefined);
    } catch (error) {
        logger.error('Redis Set Error', { key, error });
    }
}
