import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 250);

export async function profileAsync<T>(
    name: string,
    fn: () => PromiseLike<T> | T,
    metadata: Record<string, any> = {}
): Promise<T> {
    const start = performance.now();

    try {
        const result = await fn();
        const durationMs = Number((performance.now() - start).toFixed(1));

        if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
            const payload = { duration_ms: durationMs, ...metadata };
            logger.warn(`Slow query detected: ${name}`, payload);
            Sentry.captureMessage(`Slow query: ${name}`, {
                level: 'warning',
                extra: payload,
            });
        }

        return result;
    } catch (error) {
        const durationMs = Number((performance.now() - start).toFixed(1));
        logger.error(`Query failed: ${name}`, { duration_ms: durationMs, ...metadata, error });
        Sentry.captureException(error, {
            extra: {
                query_name: name,
                duration_ms: durationMs,
                ...metadata,
            },
        });
        throw error;
    }
}

export function captureOperationalAlert(message: string, metadata: Record<string, any> = {}) {
    logger.warn(message, metadata);
    Sentry.captureMessage(message, {
        level: 'warning',
        extra: metadata,
    });
}
