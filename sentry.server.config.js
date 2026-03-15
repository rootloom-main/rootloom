import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === 'development';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Disable tracing in dev to prevent "ERR_INVALID_STATE: ReadableStream is already closed"
    tracesSampleRate: isDev ? 0 : 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
});
