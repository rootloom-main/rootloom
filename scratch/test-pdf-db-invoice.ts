import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { compileHtmlToReactPdf } from '../lib/utils/html-to-pdf';
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
        .select('id, order_number')
        .eq('order_number', 'ORD1783932135328688')
        .single() as any;

    console.log('Fetching existing invoice snapshot...');
    const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle() as any;

    if (!existingInvoice) {
        console.log('No existing invoice found in DB!');
        return;
    }

    console.log('Invoice number:', existingInvoice.invoice_number);
    console.log('Compiling React PDF Elements from DB html_snapshot...');
    try {
        const reactElements = compileHtmlToReactPdf(existingInvoice.html_snapshot);
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
