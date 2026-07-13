import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/utils/auth';

export const runtime = 'nodejs';

// GET a single template with active version
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient() as any;

    const { data: template, error } = await supabase
        .from('invoice_templates')
        .select(`
            *,
            versions:invoice_template_versions (
                *
            )
        `)
        .eq('id', id)
        .single() as any;

    if (error || !template) {
        return NextResponse.json({ error: error?.message || 'Template not found' }, { status: 404 });
    }

    const activeVersion = template.versions?.find((v: any) => v.status === 'active') || null;
    return NextResponse.json({
        ...template,
        active_version: activeVersion,
        versions: undefined
    });
}

// PUT update template details
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { id } = await params;
    try {
        const body = await req.json();
        const { name, is_default } = body;

        const supabase = createAdminClient() as any;

        // If setting this template as default, unset others first
        if (is_default) {
            await supabase
                .from('invoice_templates')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (is_default !== undefined) updateData.is_default = !!is_default;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedTemplate, error } = await supabase
            .from('invoice_templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single() as any;

        if (error || !updatedTemplate) {
            throw new Error(error?.message || 'Failed to update template');
        }

        return NextResponse.json(updatedTemplate);
    } catch (error: any) {
        console.error('Error updating template:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE template
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { id } = await params;
    try {
        const supabase = createAdminClient() as any;

        // Get template details to check if it's default
        const { data: template } = await supabase
            .from('invoice_templates')
            .select('is_default')
            .eq('id', id)
            .single();

        if (template?.is_default) {
            return NextResponse.json({ error: 'Cannot delete the default template. Set another template as default first.' }, { status: 400 });
        }

        const { error } = await supabase
            .from('invoice_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting template:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
