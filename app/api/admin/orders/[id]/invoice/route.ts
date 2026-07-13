import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin, getCurrentUser } from '@/lib/utils/auth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

function formatMoney(value: any): string {
    const amount = Number(value || 0);
    return `Rs. ${amount.toFixed(2)}`;
}

function getInvoiceNumber(order: any): string {
    return order.order_number ? order.order_number.replace(/^ORD/, 'INV-') : `INV-${Date.now()}`;
}

function sanitizePdfText(value: any): string {
    return String(value ?? '')
        .replace(/[₹]/g, 'Rs.')
        .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
        .trim();
}

function getShippingAddress(order: any): string {
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

    return sanitizePdfText(shippingAddress);
}

async function renderInvoicePdf(order: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const contentWidth = pageWidth - margin * 2;
    const dark = rgb(0.11, 0.21, 0.18);
    const muted = rgb(0.35, 0.35, 0.35);
    const line = rgb(0.86, 0.86, 0.86);
    const lightFill = rgb(0.96, 0.97, 0.96);

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const newPage = () => {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
    };

    const drawText = (
        text: string,
        x: number,
        currentY: number,
        size = 10,
        options: { bold?: boolean; color?: any; maxWidth?: number } = {}
    ) => {
        page.drawText(sanitizePdfText(text), {
            x,
            y: currentY,
            size,
            font: options.bold ? boldFont : regularFont,
            color: options.color || rgb(0.12, 0.12, 0.12),
            maxWidth: options.maxWidth,
        });
    };

    const wrapText = (text: string, maxWidth: number, size = 10, bold = false): string[] => {
        const clean = sanitizePdfText(text);
        const words = clean.split(/\s+/).filter(Boolean);
        const font = bold ? boldFont : regularFont;
        const lines: string[] = [];
        let current = '';

        for (const word of words) {
            const candidate = current ? `${current} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                current = candidate;
            } else {
                if (current) lines.push(current);
                current = word;
            }
        }

        if (current) lines.push(current);
        return lines.length ? lines : [''];
    };

    const drawWrapped = (text: string, x: number, maxWidth: number, size = 10, bold = false, color = rgb(0.12, 0.12, 0.12)) => {
        for (const lineText of wrapText(text, maxWidth, size, bold)) {
            if (y < margin + 48) newPage();
            drawText(lineText, x, y, size, { bold, color, maxWidth });
            y -= size + 4;
        }
    };

    const drawHorizontalLine = (currentY: number, color = line) => {
        page.drawLine({
            start: { x: margin, y: currentY },
            end: { x: pageWidth - margin, y: currentY },
            thickness: 1,
            color,
        });
    };

    const invoiceNumber = getInvoiceNumber(order);
    const invoiceDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const items = order.order_items || [];
    const subtotal = items.reduce((sum: number, item: any) => {
        return sum + Number(item.price || 0) * Number(item.quantity || 0);
    }, 0);
    const shipping = Number(order.shipping_cost || 0);
    const grandTotal = Number(order.total || subtotal + shipping);
    const discount = Math.max(0, subtotal + shipping - grandTotal);

    drawText('Root & Loom', margin, y, 18, { bold: true, color: dark });
    drawText('TAX INVOICE', pageWidth - margin - 145, y, 20, { bold: true, color: dark });
    y -= 26;
    drawText('root@rootloom.in', margin, y, 9, { color: muted });
    drawText(`Invoice No: ${invoiceNumber}`, pageWidth - margin - 145, y, 9, { color: muted });
    y -= 14;
    drawText('www.rootloom.in', margin, y, 9, { color: muted });
    drawText(`Date: ${invoiceDate}`, pageWidth - margin - 145, y, 9, { color: muted });
    y -= 18;
    drawHorizontalLine(y, dark);
    y -= 24;

    drawText('Billed To', margin, y, 11, { bold: true, color: dark });
    y -= 17;
    drawWrapped(getShippingAddress(order), margin, contentWidth * 0.58, 9);
    drawWrapped(`Email: ${order.profiles?.email || 'N/A'}`, margin, contentWidth * 0.58, 9);
    drawWrapped(`Phone: ${order.shipping_address?.phone || order.profiles?.phone || 'N/A'}`, margin, contentWidth * 0.58, 9);

    const paymentX = margin + contentWidth * 0.65;
    const paymentTop = pageHeight - margin - 86;
    drawText('Payment Details', paymentX, paymentTop, 11, { bold: true, color: dark });
    drawText(`Method: ${order.payment_id ? 'Razorpay' : 'N/A'}`, paymentX, paymentTop - 17, 9);
    drawText(`Status: ${order.payment_status || 'Pending'}`, paymentX, paymentTop - 31, 9);
    drawText(`Order: ${order.order_number || order.id}`, paymentX, paymentTop - 45, 9, { maxWidth: contentWidth * 0.35 });

    y -= 14;
    page.drawRectangle({
        x: margin,
        y: y - 22,
        width: contentWidth,
        height: 24,
        color: lightFill,
        borderColor: line,
        borderWidth: 1,
    });
    drawText('Item', margin + 8, y - 14, 9, { bold: true, color: dark });
    drawText('Qty', margin + 328, y - 14, 9, { bold: true, color: dark });
    drawText('Unit Price', margin + 382, y - 14, 9, { bold: true, color: dark });
    drawText('Total', margin + 470, y - 14, 9, { bold: true, color: dark });
    y -= 32;

    if (items.length === 0) {
        drawText('No line items found for this order.', margin + 8, y, 9, { color: muted });
        y -= 18;
    }

    for (const item of items) {
        if (y < margin + 92) newPage();
        const productName = item.product?.name || 'Item';
        const variant = [item.variant?.size, item.variant?.color].filter(Boolean).join(' / ');
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.price || 0);
        const rowTop = y;
        const itemLines = wrapText(variant ? `${productName} (${variant})` : productName, 300, 9);
        const rowHeight = Math.max(24, itemLines.length * 13 + 8);

        page.drawRectangle({
            x: margin,
            y: rowTop - rowHeight + 6,
            width: contentWidth,
            height: rowHeight,
            borderColor: line,
            borderWidth: 0.5,
        });

        let itemY = rowTop - 9;
        for (const lineText of itemLines) {
            drawText(lineText, margin + 8, itemY, 9, { maxWidth: 300 });
            itemY -= 13;
        }
        drawText(String(quantity), margin + 333, rowTop - 9, 9);
        drawText(formatMoney(unitPrice), margin + 382, rowTop - 9, 9);
        drawText(formatMoney(unitPrice * quantity), margin + 470, rowTop - 9, 9);

        y -= rowHeight;
    }

    y -= 12;
    const totalsX = pageWidth - margin - 190;
    const drawTotalLine = (label: string, value: string, bold = false) => {
        if (y < margin + 60) newPage();
        drawText(label, totalsX, y, 10, { bold, color: bold ? dark : rgb(0.12, 0.12, 0.12) });
        drawText(value, totalsX + 105, y, 10, { bold, color: bold ? dark : rgb(0.12, 0.12, 0.12) });
        y -= 16;
    };

    drawTotalLine('Subtotal', formatMoney(subtotal));
    drawTotalLine('Shipping', shipping === 0 ? 'Free' : formatMoney(shipping));
    if (discount > 0) drawTotalLine('Discount', `-${formatMoney(discount)}`);
    drawHorizontalLine(y + 6);
    drawTotalLine('Grand Total', formatMoney(grandTotal), true);

    y = Math.max(y - 20, margin + 32);
    drawHorizontalLine(y + 16);
    drawWrapped('This is a computer generated invoice and does not require a physical signature.', margin, contentWidth, 8, false, muted);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

async function saveInvoiceSnapshot(supabase: any, order: any) {
    const invoiceNumber = getInvoiceNumber(order);
    const htmlSnapshot = `<p>Invoice ${invoiceNumber} generated from order ${order.order_number || order.id}</p>`;

    try {
        await supabase.from('invoices').upsert({
            order_id: order.id,
            invoice_number: invoiceNumber,
            company_name: 'Root & Loom',
            company_address: '',
            company_details: {},
            tax_config: { currencySymbol: 'Rs.' },
            layout_config: [],
            html_snapshot: htmlSnapshot,
            css_snapshot: '',
        }, { onConflict: 'order_id' });
    } catch (dbErr) {
        console.error('Failed to save invoice snapshot:', dbErr);
    }
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
        const pdfBuffer = await renderInvoicePdf(order);
        await saveInvoiceSnapshot(supabase, order);
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
