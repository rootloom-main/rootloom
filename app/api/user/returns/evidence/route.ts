import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/utils/auth';
import { isAdmin } from '@/lib/utils/auth';
import { createReturnEvidenceSignedUrl } from '@/lib/returns/evidence';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const supabase = await createSSRClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const returnId = req.nextUrl.searchParams.get('returnId');
    if (!returnId) {
        return NextResponse.json({ error: 'Missing returnId' }, { status: 400 });
    }

    const signedUrl = await createReturnEvidenceSignedUrl({
        returnId,
        actorId: user.id,
        isAdmin: await isAdmin(),
    });

    if (!signedUrl) {
        return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    return NextResponse.json(
        { signedUrl },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate' } }
    );
}
