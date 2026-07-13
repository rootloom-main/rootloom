import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin, getCurrentUser } from '@/lib/utils/auth';

export const runtime = 'nodejs';

// POST restore a version
export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string; versionId: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { id, versionId } = await params;
    try {
        const user = await getCurrentUser();
        const supabase = createAdminClient() as any;

        // 1. Fetch target version details to restore
        const { data: targetVersion, error: fetchError } = await supabase
            .from('invoice_template_versions')
            .select('*')
            .eq('id', versionId)
            .eq('template_id', id)
            .single() as any;

        if (fetchError || !targetVersion) {
            return NextResponse.json({ error: 'Target version not found' }, { status: 404 });
        }

        // 2. Fetch current max version number
        const { data: maxVersionData, error: maxVersionError } = await supabase
            .from('invoice_template_versions')
            .select('version_number')
            .eq('template_id', id)
            .order('version_number', { ascending: false })
            .limit(1) as any;

        if (maxVersionError) {
            throw new Error(maxVersionError.message);
        }

        const currentMax = maxVersionData?.[0]?.version_number || 0;
        const nextVersion = currentMax + 1;

        // 3. Set all existing active versions to archived
        await supabase
            .from('invoice_template_versions')
            .update({ status: 'archived' })
            .eq('template_id', id)
            .eq('status', 'active');

        // 4. Create new version copying target version's content
        const { data: restoredVersion, error: insertError } = await supabase
            .from('invoice_template_versions')
            .insert({
                template_id: id,
                version_number: nextVersion,
                html: targetVersion.html,
                css: targetVersion.css || '',
                header: targetVersion.header,
                footer: targetVersion.footer,
                tax_config: targetVersion.tax_config,
                layout_config: targetVersion.layout_config,
                print_settings: targetVersion.print_settings,
                status: 'active',
                created_by: user?.id || null
            })
            .select()
            .single() as any;

        if (insertError || !restoredVersion) {
            throw new Error(insertError?.message || 'Failed to create restored version record');
        }

        // 5. Update template metadata updated_at timestamp
        await supabase
            .from('invoice_templates')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', id);

        return NextResponse.json(restoredVersion);
    } catch (error: any) {
        console.error('Error restoring template version:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
