export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Fix for Windows local development certificate issues
        if (process.env.NODE_ENV === 'development') {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
        await import('./sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}
