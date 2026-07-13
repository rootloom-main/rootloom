import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin, getCurrentUser } from '@/lib/utils/auth';
import { compileInvoiceTemplate } from '@/lib/utils/invoice-compiler';
import { compileHtmlToReactPdf } from '@/lib/utils/html-to-pdf';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

export const runtime = 'nodejs';

async function renderPdf(html: string, printSettings: any): Promise<Buffer> {
    const paperSize = printSettings.paperSize === 'Letter' ? 'LETTER' : 'A4';
    const orientation = printSettings.orientation === 'landscape' ? 'landscape' : 'portrait';
    const topMargin    = printSettings.margins?.top    !== undefined ? Number(printSettings.margins.top)    * 2.83 : 30;
    const bottomMargin = printSettings.margins?.bottom !== undefined ? Number(printSettings.margins.bottom) * 2.83 : 30;
    const leftMargin   = printSettings.margins?.left   !== undefined ? Number(printSettings.margins.left)   * 2.83 : 30;
    const rightMargin  = printSettings.margins?.right  !== undefined ? Number(printSettings.margins.right)  * 2.83 : 30;

    const reactElements = compileHtmlToReactPdf(html);
    const children = Array.isArray(reactElements)
        ? reactElements
        : reactElements
            ? [reactElements]
            : [];

    if (children.length === 0) {
        throw new Error('Invoice template produced no PDF content');
    }

    const doc = React.createElement(
        Document,
        {},
        React.createElement(
            Page,
            {
                size: paperSize,
                orientation,
                style: {
                    paddingTop: topMargin,
                    paddingBottom: bottomMargin,
                    paddingLeft: leftMargin,
                    paddingRight: rightMargin,
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'Helvetica',
                    fontSize: 10,
                },
            },
            ...(children as any)
        )
    );

    return await renderToBuffer(doc as any);
}

function formatMoney(value: any) {
    const amount = Number(value || 0);
    return `Rs. ${amount.toFixed(2)}`;
}

async function renderFallbackPdf(order: any): Promise<Buffer> {
    const styles = StyleSheet.create({
        page: {
            padding: 32,
            backgroundColor: '#FFFFFF',
            fontFamily: 'Helvetica',
            fontSize: 10,
            color: '#222222',
        },
        header: {
            borderBottomWidth: 1,
            borderBottomColor: '#1c352d',
            paddingBottom: 12,
            marginBottom: 18,
        },
        title: {
            fontSize: 22,
            fontFamily: 'Helvetica-Bold',
            color: '#1c352d',
            marginBottom: 6,
        },
        section: {
            marginBottom: 14,
        },
        label: {
            fontFamily: 'Helvetica-Bold',
            marginBottom: 4,
        },
        row: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: '#eeeeee',
            paddingVertical: 6,
        },
        itemName: {
            width: '55%',
        },
        qty: {
            width: '15%',
            textAlign: 'center',
        },
        amount: {
            width: '30%',
            textAlign: 'right',
        },
        total: {
            marginTop: 12,
            textAlign: 'right',
            fontSize: 13,
            fontFamily: 'Helvetica-Bold',
            color: '#1c352d',
        },
        footer: {
            marginTop: 24,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#eeeeee',
            fontSize: 8,
            color: '#666666',
            textAlign: 'center',
        },
    });

    const shippingAddress = order.shipping_address
        ? [
            order.shipping_address.full_name,
            order.shipping_address.address_line1,
            order.shipping_address.address_line2,
            order.shipping_address.city,
            order.shipping_address.state,
            order.shipping_address.postal_code,
            order.shipping_address.country || 'India',
        ].filter(Boolean).join(', ')
        : 'No shipping address provided';

    const items = order.order_items || [];

    const doc = React.createElement(
        Document,
        {},
        React.createElement(
            Page,
            { size: 'A4', style: styles.page },
            React.createElement(
                View,
                { style: styles.header },
                React.createElement(Text, { style: styles.title }, 'TAX INVOICE'),
                React.createElement(Text, null, `Invoice No: ${order.order_number || order.id}`),
                React.createElement(Text, null, `Date: ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}`)
            ),
            React.createElement(
                View,
                { style: styles.section },
                React.createElement(Text, { style: styles.label }, 'Billed To'),
                React.createElement(Text, null, shippingAddress),
                React.createElement(Text, null, `Email: ${order.profiles?.email || 'N/A'}`),
                React.createElement(Text, null, `Phone: ${order.shipping_address?.phone || order.profiles?.phone || 'N/A'}`)
            ),
            React.createElement(
                View,
                { style: styles.section },
                React.createElement(
                    View,
                    { style: [styles.row, { fontFamily: 'Helvetica-Bold', backgroundColor: '#f7f7f7' }] },
                    React.createElement(Text, { style: styles.itemName }, 'Item'),
                    React.createElement(Text, { style: styles.qty }, 'Qty'),
                    React.createElement(Text, { style: styles.amount }, 'Total')
                ),
                ...items.map((item: any, index: number) => React.createElement(
                    View,
                    { key: index, style: styles.row },
                    React.createElement(Text, { style: styles.itemName }, item.product?.name || 'Item'),
                    React.createElement(Text, { style: styles.qty }, String(item.quantity || 0)),
                    React.createElement(Text, { style: styles.amount }, formatMoney(Number(item.price || 0) * Number(item.quantity || 0)))
                ))
            ),
            React.createElement(Text, { style: styles.total }, `Grand Total: ${formatMoney(order.total)}`),
            React.createElement(Text, { style: styles.footer }, 'This fallback invoice was generated because the saved invoice template could not be rendered.')
        )
    );

    return await renderToBuffer(doc as any);
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient() as any;
    const userIsAdmin = await isAdmin();

    if (!userIsAdmin) {
        const { data: orderOwner, error: ownerError } = await supabase
            .from('orders')
            .select('user_id')
            .eq('id', id)
            .maybeSingle();

        if (ownerError || !orderOwner || orderOwner.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    // 1. Fetch order details
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
            cssSnapshot  = existingInvoice.css_snapshot || '';
            printSettings = existingInvoice.template_version?.print_settings || printSettings;
        } else {
            // 3. Retrieve default active template
            const { data: defaultTemplate } = await supabase
                .from('invoice_templates')
                .select(`
                    id,
                    invoice_template_versions (
                        id, html, css, header, footer,
                        tax_config, layout_config, print_settings, status
                    )
                `)
                .eq('is_default', true)
                .maybeSingle();

            const activeVersion = defaultTemplate?.invoice_template_versions?.find(
                (v: any) => v.status === 'active'
            );

            let versionId = null;
            let templateHtml = '';
            let templateCss  = '';
            let header: any  = {};
            let footer: any  = {};
            let taxConfig: any   = {};
            let layoutConfig: any[] = [];

            if (activeVersion) {
                versionId     = activeVersion.id;
                templateHtml  = activeVersion.html;
                templateCss   = activeVersion.css || '';
                header        = activeVersion.header;
                footer        = activeVersion.footer;
                taxConfig     = activeVersion.tax_config;
                layoutConfig  = activeVersion.layout_config;
                printSettings = activeVersion.print_settings || printSettings;
            } else {
                // Fallback minimal template
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

            const prefix        = taxConfig.invoicePrefix || 'INV-';
            const invoiceNumber = order.order_number
                ? order.order_number.replace('ORD', prefix)
                : `${prefix}${Date.now().toString().slice(-6)}`;

            htmlSnapshot = compileInvoiceTemplate(templateHtml, order, {
                header,
                footer,
                tax_config: taxConfig,
                layout_config: layoutConfig,
            });
            cssSnapshot = templateCss;

            // 4. Save invoice snapshot for history
            try {
                await supabase.from('invoices').insert({
                    order_id:            id,
                    invoice_number:      invoiceNumber,
                    template_version_id: versionId,
                    company_name:        header.companyName || 'Root & Loom',
                    company_address:     header.companyAddress || '',
                    company_details:     header,
                    tax_config:          taxConfig,
                    layout_config:       layoutConfig,
                    html_snapshot:       htmlSnapshot,
                    css_snapshot:        cssSnapshot,
                });
            } catch (dbErr) {
                console.error('Failed to save invoice snapshot:', dbErr);
            }
        }

        // 5. Render PDF inline (works in both dev and Vercel serverless)
        let pdfBuffer: Buffer;
        try {
            pdfBuffer = await renderPdf(htmlSnapshot, printSettings);
        } catch (renderErr) {
            console.error('Template invoice render failed, using fallback PDF:', renderErr);
            pdfBuffer = await renderFallbackPdf(order);
        }
        const fileName  = `invoice-${order.order_number}.pdf`;

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type':        'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control':       'private, no-store, max-age=0, must-revalidate',
            },
        });

    } catch (err: any) {
        console.error('Error generating PDF invoice:', err);
        return NextResponse.json(
            { error: 'Failed to generate PDF: ' + err.message },
            { status: 500 }
        );
    }
}
