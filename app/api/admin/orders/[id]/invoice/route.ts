import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/utils/auth';
import { compileInvoiceTemplate } from '@/lib/utils/invoice-compiler';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';

function runCliCompiler(html: string, printSettings: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const cliPath = path.join(process.cwd(), 'lib/utils/compile-pdf-cli.ts');
        const topMargin = printSettings.margins?.top !== undefined ? Number(printSettings.margins.top) * 2.83 : 30;
        const bottomMargin = printSettings.margins?.bottom !== undefined ? Number(printSettings.margins.bottom) * 2.83 : 30;
        const leftMargin = printSettings.margins?.left !== undefined ? Number(printSettings.margins.left) * 2.83 : 30;
        const rightMargin = printSettings.margins?.right !== undefined ? Number(printSettings.margins.right) * 2.83 : 30;

        const child = spawn('npx', [
            'tsx',
            cliPath,
            printSettings.paperSize || 'A4',
            printSettings.orientation || 'portrait',
            String(topMargin),
            String(bottomMargin),
            String(leftMargin),
            String(rightMargin)
        ], { shell: true });

        const chunks: Buffer[] = [];
        const errChunks: Buffer[] = [];

        child.stdout.on('data', (chunk) => chunks.push(chunk));
        child.stderr.on('data', (chunk) => errChunks.push(chunk));

        child.on('close', (code) => {
            if (code === 0) {
                resolve(Buffer.concat(chunks));
            } else {
                const errMsg = Buffer.concat(errChunks).toString();
                reject(new Error(`PDF compiler process failed (code ${code}): ${errMsg}`));
            }
        });

        child.stdin.write(html);
        child.stdin.end();
    });
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createAdminClient() as any;
    
    // 1. Fetch order details with joins
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
            *,
            profiles (full_name, email, phone),
            shipping_address:addresses (*),
            order_items (
                *,
                product:products (name),
                variant:product_variants (size, color)
            )
        `)
        .eq('id', id)
        .single();

    if (orderError || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    try {
        let htmlSnapshot = '';
        let cssSnapshot = '';
        let printSettings: any = {
            paperSize: 'A4',
            orientation: 'portrait',
            margins: { top: 10, left: 10, right: 10, bottom: 10 }
        };

        // 2. Check if invoice snapshot already exists
        const { data: existingInvoice } = await supabase
            .from('invoices')
            .select(`
                *,
                template_version:invoice_template_versions (
                    print_settings
                )
            `)
            .eq('order_id', id)
            .maybeSingle();

        if (existingInvoice) {
            htmlSnapshot = existingInvoice.html_snapshot;
            cssSnapshot = existingInvoice.css_snapshot || '';
            printSettings = existingInvoice.template_version?.print_settings || printSettings;
        } else {
            // 3. Retrieve default active template
            const { data: defaultTemplate } = await supabase
                .from('invoice_templates')
                .select(`
                    id,
                    invoice_template_versions (
                        id,
                        html,
                        css,
                        header,
                        footer,
                        tax_config,
                        layout_config,
                        print_settings,
                        status
                    )
                `)
                .eq('is_default', true)
                .maybeSingle();

            const activeVersion = defaultTemplate?.invoice_template_versions?.find(
                (v: any) => v.status === 'active'
            );

            let versionId = null;
            let templateHtml = '';
            let templateCss = '';
            let header = {};
            let footer = {};
            let taxConfig: any = {};
            let layoutConfig = [];

            if (activeVersion) {
                versionId = activeVersion.id;
                templateHtml = activeVersion.html;
                templateCss = activeVersion.css || '';
                header = activeVersion.header;
                footer = activeVersion.footer;
                taxConfig = activeVersion.tax_config;
                layoutConfig = activeVersion.layout_config;
                printSettings = activeVersion.print_settings || printSettings;
            } else {
                // Fallback hardcoded defaults if no active template is found in DB
                templateHtml = `<div style="font-family: Arial, sans-serif; padding: 15px;">
                    <h1 style="color: #1c352d;">TAX INVOICE</h1>
                    <p>Invoice # {{invoiceNumber}}</p>
                    <p>Date: {{invoiceDate}}</p>
                    <p>Customer: {{customerName}}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background-color: #f3f4f6;">
                                <th style="text-align: left; padding: 6px;">Description</th>
                                <th style="text-align: center; padding: 6px; width: 10%;">Qty</th>
                                <th style="text-align: right; padding: 6px; width: 20%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>{{items}}</tbody>
                    </table>
                    <div style="text-align: right; margin-top: 15px; font-weight: bold;">Grand Total: {{grandTotal}}</div>
                </div>`;
                taxConfig = { invoicePrefix: 'INV-' };
            }

            // Generate invoice number
            const prefix = taxConfig.invoicePrefix || 'INV-';
            const invoiceNumber = order.order_number 
                ? order.order_number.replace('ORD', prefix) 
                : `${prefix}${Date.now().toString().slice(-6)}`;

            // Compile template
            htmlSnapshot = compileInvoiceTemplate(templateHtml, order, {
                header,
                footer,
                tax_config: taxConfig,
                layout_config: layoutConfig
            });
            cssSnapshot = templateCss;

            // 4. Save invoice snapshot in db for history preservation
            try {
                await supabase.from('invoices').insert({
                    order_id: id,
                    invoice_number: invoiceNumber,
                    template_version_id: versionId,
                    company_name: (header as any).companyName || 'Root & Loom',
                    company_address: (header as any).companyAddress || '',
                    company_details: header,
                    tax_config: taxConfig,
                    layout_config: layoutConfig,
                    html_snapshot: htmlSnapshot,
                    css_snapshot: cssSnapshot
                });
            } catch (dbErr) {
                console.error('Failed to save invoice snapshot in db:', dbErr);
            }
        }

        // 5. Build PDF using CLI compiler process
        const pdfBuffer = await runCliCompiler(htmlSnapshot, printSettings);
        const fileName = `invoice-${order.order_number}.pdf`;

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
            },
        });

    } catch (err: any) {
        console.error('Error compiling PDF invoice:', err);
        return NextResponse.json({ error: 'Failed to generate PDF: ' + err.message }, { status: 500 });
    }
}
