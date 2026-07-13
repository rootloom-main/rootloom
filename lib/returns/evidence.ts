import { createAdminClient } from '@/lib/supabase/admin';

export async function createReturnEvidenceSignedUrl({
    returnId,
    actorId,
    isAdmin,
    expiresInSeconds = 300,
}: {
    returnId: string;
    actorId: string;
    isAdmin: boolean;
    expiresInSeconds?: number;
}) {
    const supabase = createAdminClient();

    const { data: ret, error } = await (supabase
        .from('returns')
        .select('id, user_id, image_path, image_url')
        .eq('id', returnId)
        .single() as any);

    if (error || !ret) {
        return null;
    }

    if (!isAdmin && ret.user_id !== actorId) {
        return null;
    }

    if ((ret as any).image_path) {
        const { data, error: signedError } = await supabase.storage
            .from('returns')
            .createSignedUrl((ret as any).image_path, expiresInSeconds);

        if (signedError) {
            console.error('[Returns] Failed to create signed evidence URL', signedError);
            return null;
        }

        return data.signedUrl;
    }

    // Legacy compatibility while old public URLs are migrated to private paths.
    return (ret as any).image_url || null;
}
