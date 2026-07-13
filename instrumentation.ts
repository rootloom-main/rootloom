import * as Sentry from '@sentry/nextjs';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Fix for Windows local development certificate issues
        if (process.env.NODE_ENV === 'development') {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
        const { validateServerEnvironment } = await import('./lib/env-validation');
        validateServerEnvironment();
        await import('./sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

export const onRequestError = Sentry.captureRequestError;
