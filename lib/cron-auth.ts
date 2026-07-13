import { NextResponse } from 'next/server';

type CronAuthResult =
    | { ok: true }
    | { ok: false; response: NextResponse };

function hasVercelCronSignal(request: Request) {
    const userAgent = request.headers.get('user-agent') || '';
    const vercelCron = request.headers.get('x-vercel-cron');

    return userAgent.toLowerCase().includes('vercel-cron') || vercelCron === '1';
}

export function verifyCronRequest(request: Request): CronAuthResult {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[Cron] CRON_SECRET is missing; refusing to run scheduled task.');
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Cron is not configured securely' },
                { status: 500 }
            ),
        };
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    if (process.env.VERCEL === '1' && !hasVercelCronSignal(request)) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Invalid cron source' }, { status: 403 }),
        };
    }

    return { ok: true };
}
