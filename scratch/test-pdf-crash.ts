import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { compileHtmlToReactPdf } from '../lib/utils/html-to-pdf';
import { compileInvoiceTemplate } from '../lib/utils/invoice-compiler';
import { renderToBuffer, Document, Page } from '@react-pdf/renderer';
import React from 'react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    console.log('Fetching order details...');
    const { data: order } = await supabase
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
        .eq('order_number', 'ORD1783932135328688')
        .single() as any;

    console.log('Fetching active template...');
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
        .maybeSingle() as any;

    const activeVersion = defaultTemplate?.invoice_template_versions?.find(
        (v: any) => v.status === 'active'
    );

    let templateHtml = activeVersion.html;
    let header = activeVersion.header;
    let footer = activeVersion.footer;
    let taxConfig = activeVersion.tax_config;
    let layoutConfig = activeVersion.layout_config;

    console.log('Compiling HTML...');
    const htmlSnapshot = compileInvoiceTemplate(templateHtml, order, {
        header,
        footer,
        tax_config: taxConfig,
        layout_config: layoutConfig
    });

    console.log('Compiling React PDF Elements...');
    try {
        const reactElements = compileHtmlToReactPdf(htmlSnapshot);
        const documentElement = React.createElement(Document, {}, 
            React.createElement(Page, { 
                size: 'A4',
                orientation: 'portrait',
                style: {
                    padding: 30,
                    backgroundColor: '#FFFFFF',
                    fontFamily: 'Helvetica',
                    fontSize: 10
                }
            }, ...reactElements as any)
        );

        console.log('Rendering PDF to buffer...');
        await renderToBuffer(documentElement as any);
        console.log('Success! PDF generated successfully.');
    } catch (e: any) {
        console.error('CRASH DETECTED:', e);
    }
}

run();
