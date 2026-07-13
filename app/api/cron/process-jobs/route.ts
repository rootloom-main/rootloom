import { processNextJob } from '@/lib/jobs';
import { NextResponse } from 'next/server';
import { verifyCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const cronAuth = verifyCronRequest(request);
        if (!cronAuth.ok) {
            return cronAuth.response;
        }

        // Process one job per invocation. 
        // In a real scenario, you might want to process a batch or loop until time runs out.
        await processNextJob();

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
