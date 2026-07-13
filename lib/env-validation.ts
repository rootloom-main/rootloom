export function validateServerEnvironment() {
    const missing: string[] = [];

    if (!process.env.CRON_SECRET) {
        missing.push('CRON_SECRET');
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        missing.push('SUPABASE_SERVICE_ROLE_KEY');
    }



    if (missing.length > 0) {
        const message = `Missing production server env vars: ${missing.join(', ')}`;
        console.error(`[EnvValidation] CRITICAL ERROR: ${message}. Admin routes and cron jobs will fail.`);
    }
}
