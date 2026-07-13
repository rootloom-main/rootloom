import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin, getCurrentUser } from '@/lib/utils/auth';

export const runtime = 'nodejs';

// GET all versions of a template
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient() as any;

    const { data: versions, error } = await supabase
        .from('invoice_template_versions')
        .select('*')
        .eq('template_id', id)
        .order('version_number', { ascending: false }) as any;

    if (error) {
        console.error('Error fetching template versions:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(versions);
}

// POST save a new version of the template
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { id } = await params;
    try {
        const user = await getCurrentUser();
        const body = await req.json();
        const { html, css, header, footer, tax_config, layout_config, print_settings } = body;

        if (!html) {
            return NextResponse.json({ error: 'Template HTML is required' }, { status: 400 });
        }

        const supabase = createAdminClient() as any;

        // 1. Fetch current max version number
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

        // 2. Set all existing active versions to archived
        await supabase
            .from('invoice_template_versions')
            .update({ status: 'archived' })
            .eq('template_id', id)
            .eq('status', 'active');

        // 3. Insert new active version
        const { data: newVersion, error: insertError } = await supabase
            .from('invoice_template_versions')
            .insert({
                template_id: id,
                version_number: nextVersion,
                html,
                css: css || '',
                header: header || {},
                footer: footer || {},
                tax_config: tax_config || {},
                layout_config: layout_config || [],
                print_settings: print_settings || {},
                status: 'active',
                created_by: user?.id || null
            })
            .select()
            .single() as any;

        if (insertError || !newVersion) {
            throw new Error(insertError?.message || 'Failed to create new version');
        }

        // 4. Update template updated_at
        await supabase
            .from('invoice_templates')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', id);

        return NextResponse.json(newVersion);
    } catch (error: any) {
        console.error('Error saving new template version:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
