export function formatCurrency(amount: number, symbol: string = '₹', precision: number = 2): string {
    return `${symbol}${amount.toFixed(precision)}`;
}

export const DEFAULT_BLOCKS: Record<string, string> = {
    header: `<div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1c352d; padding-bottom: 12px; margin-bottom: 15px; align-items: center;">
    <div>
      <img src="{{companyLogo}}" style="max-height: 45px; max-width: 150px; margin-bottom: 8px;" />
      <h2 style="margin: 0; font-size: 16px; color: #1c352d;">{{companyName}}</h2>
      <p style="margin: 2px 0; font-size: 9px; color: #666;">{{companyAddress}}</p>
      <p style="margin: 2px 0; font-size: 9px; color: #666;">GSTIN: {{companyGST}} | PAN: {{companyPAN}} | CIN: {{companyCIN}}</p>
    </div>
    <div style="text-align: right;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #1c352d; letter-spacing: 1px;">TAX INVOICE</h1>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Invoice No:</strong> {{invoiceNumber}}</p>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Date:</strong> {{invoiceDate}}</p>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Order ID:</strong> {{orderId}}</p>
    </div>
  </div>`,
    customer: `<div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
    <div style="width: 48%;">
      <h3 style="margin: 0 0 6px 0; font-size: 10px; text-transform: uppercase; color: #1c352d; border-bottom: 1px solid #ddd; padding-bottom: 3px; font-weight: bold;">Billed To</h3>
      <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">{{customerName}}</p>
      <p style="margin: 2px 0; font-size: 9px; color: #444;">{{customerAddress}}</p>
      <p style="margin: 2px 0; font-size: 9px; color: #444;">Phone: {{customerPhone}}</p>
      <p style="margin: 2px 0; font-size: 9px; color: #444;">Email: {{customerEmail}}</p>
    </div>
    <div style="width: 48%;">
      <h3 style="margin: 0 0 6px 0; font-size: 10px; text-transform: uppercase; color: #1c352d; border-bottom: 1px solid #ddd; padding-bottom: 3px; font-weight: bold;">Payment Details</h3>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Payment Status:</strong> {{paymentStatus}}</p>
    </div>
  </div>`,
    items: `<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
    <thead>
      <tr style="background-color: #f3f4f6; border-bottom: 2px solid #ccc; color: #1c352d;">
        <th style="text-align: left; padding: 6px; font-weight: bold;">Item Description</th>
        <th style="text-align: center; padding: 6px; font-weight: bold; width: 8%;">Qty</th>
        <th style="text-align: right; padding: 6px; font-weight: bold; width: 18%;">Unit Price</th>
        <th style="text-align: right; padding: 6px; font-weight: bold; width: 18%;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{items}}
    </tbody>
  </table>`,
    totals: `<div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
    <div style="width: 40%; background-color: #f9fafb; padding: 8px; border-radius: 4px; border: 1px solid #f3f4f6;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 9px;">
        <span>Subtotal</span>
        <span>{{subtotal}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 9px; color: #059669; font-weight: bold;">
        <span>Savings & Discount</span>
        <span>-{{discount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 9px;">
        <span>Shipping</span>
        <span>{{shipping}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 8px; color: #666;">
        <span>CGST ({{cgstRate}}%)</span>
        <span>{{cgst}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 8px; color: #666;">
        <span>SGST ({{sgstRate}}%)</span>
        <span>{{sgst}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 8px; color: #666;">
        <span>IGST ({{igstRate}}%)</span>
        <span>{{igst}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 8px; color: #666;">
        <span>Total Tax</span>
        <span>{{tax}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 5px; font-size: 11px; font-weight: bold; color: #1c352d;">
        <span>Grand Total</span>
        <span>{{grandTotal}}</span>
      </div>
    </div>
  </div>`,
    payment: `<div style="margin-bottom: 15px; border: 1px solid #e5e7eb; padding: 8px; border-radius: 4px;">
    <h4 style="margin: 0 0 4px 0; font-size: 9px; text-transform: uppercase; color: #1c352d; font-weight: bold;">Bank & UPI Details</h4>
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 8px; color: #555;">
        <p style="margin: 2px 0;"><strong>Bank:</strong> {{bankName}} | <strong>A/c Name:</strong> {{bankAccountName}}</p>
        <p style="margin: 2px 0;"><strong>A/c No:</strong> {{bankAccountNumber}} | <strong>IFSC:</strong> {{bankIFSC}}</p>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <img src="{{upiQRCode}}" style="height: 45px; width: 45px;" />
        <span style="font-size: 7px; color: #666; max-width: 80px;">Scan to pay via UPI</span>
      </div>
    </div>
  </div>`,
    notes: `<div style="margin-bottom: 15px; font-size: 8px; background-color: #fffbeb; border: 1px solid #fef3c7; padding: 6px; border-radius: 4px;">
    <p style="margin: 0;"><strong>Order Notes:</strong> {{notes}}</p>
  </div>`,
    signature: `<div style="display: flex; justify-content: flex-end; margin-bottom: 15px; align-items: flex-end;">
    <div style="width: 35%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
      <div style="position: relative; height: 40px; margin-bottom: 2px; width: 100px;">
        <img src="{{stampImage}}" style="height: 35px; opacity: 0.6; position: absolute; left: 10px; top: 0;" />
        <img src="{{signatureImage}}" style="height: 30px; position: relative; z-index: 2;" />
      </div>
      <p style="margin: 0; font-size: 8px; border-top: 1px solid #bbb; padding-top: 2px; width: 100%;">Authorized Signatory</p>
    </div>
  </div>`,
    terms: `<div style="font-size: 7.5px; color: #666; line-height: 1.3; margin-bottom: 15px;">
    <p style="margin: 0 0 2px 0; font-weight: bold; text-transform: uppercase; color: #444;">Terms & Conditions</p>
    <p style="margin: 0 0 4px 0;">{{termsAndConditions}}</p>
    <p style="margin: 0 0 2px 0; font-weight: bold; text-transform: uppercase; color: #444;">Return Policy</p>
    <p style="margin: 0;">{{returnPolicy}}</p>
  </div>`,
    footer: `<div style="text-align: center; border-top: 1px solid #eee; padding-top: 8px; margin-top: 15px; font-size: 8px; color: #888;">
    {{footer}}
  </div>`
};

export function assembleHtmlFromLayout(layoutConfig: any[]): string {
    const activeLayout = layoutConfig.length > 0 ? layoutConfig : [
        { id: 'header', visible: true },
        { id: 'customer', visible: true },
        { id: 'items', visible: true },
        { id: 'totals', visible: true },
        { id: 'payment', visible: true },
        { id: 'notes', visible: true },
        { id: 'signature', visible: true },
        { id: 'terms', visible: true },
        { id: 'footer', visible: true }
    ];

    let fullHtml = '<div style="font-family: Arial, sans-serif; color: #333; padding: 10px; line-height: 1.4;">';
    
    for (const section of activeLayout) {
        if (section.visible && DEFAULT_BLOCKS[section.id]) {
            fullHtml += DEFAULT_BLOCKS[section.id] + '\n';
        }
    }
    
    fullHtml += '</div>';
    return fullHtml;
}

export function compileInvoiceTemplate(
    htmlTemplate: string,
    order: any,
    config: {
        header: any;
        footer: any;
        tax_config: any;
        layout_config?: any[];
    }
): string {
    const header = config.header || {};
    const footer = config.footer || {};
    const taxConfig = config.tax_config || {};

    const symbol = taxConfig.currencySymbol || '₹';
    const precision = taxConfig.decimalPrecision || 2;

    // Calculate subtotal
    const subtotal = order.order_items?.reduce(
        (sum: number, item: any) => sum + parseFloat(item.price) * item.quantity,
        0
    ) || parseFloat(order.subtotal) || 0;

    // Calculate discount
    const discountAmount = order.total < subtotal ? (subtotal - order.total) : 0;
    
    // Shipping
    const shipping = parseFloat(order.shipping_cost) || 0;

    // GST State Logic
    // Default origin state is Gujarat. If shipping state is different, IGST applies. Otherwise CGST + SGST
    const originState = (header.companyAddress || '').toLowerCase().includes('gujarat') ? 'gujarat' : 'delhi'; // simple state resolution
    const shippingState = (order.shipping_address?.state || '').toLowerCase().trim();
    
    const cgstRate = taxConfig.cgst || 9;
    const sgstRate = taxConfig.sgst || 9;
    const igstRate = taxConfig.igst || 18;

    const isIntrastate = shippingState === '' || shippingState.includes(originState);

    // Calculate tax amounts
    // Tax is included in the total order price, so extract it back
    const totalTaxRate = isIntrastate ? (cgstRate + sgstRate) : igstRate;
    const grossTotal = parseFloat(order.total) || 0;
    
    // Taxable value = Total / (1 + Tax Rate / 100)
    const taxableValue = grossTotal / (1 + totalTaxRate / 100);
    const totalTaxAmount = grossTotal - taxableValue;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isIntrastate) {
        cgstAmount = totalTaxAmount / 2;
        sgstAmount = totalTaxAmount / 2;
    } else {
        igstAmount = totalTaxAmount;
    }

    // Render items table rows
    let itemsHtml = '';
    for (const item of order.order_items || []) {
        const itemName = item.product?.name || 'Item';
        const variantStr = (item.variant?.size || item.variant?.color)
            ? `Variant: ${item.variant?.size || ''} | ${item.variant?.color || ''}`
            : '';
        const itemTotal = parseFloat(item.price) * item.quantity;

        itemsHtml += `
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #eee;">
            <strong style="color: #1c352d;">${itemName}</strong><br/>
            <span style="font-size: 8px; color: #666;">${variantStr}</span>
          </td>
          <td style="text-align: center; padding: 6px; border-bottom: 1px solid #eee;">${item.quantity}</td>
          <td style="text-align: right; padding: 6px; border-bottom: 1px solid #eee;">${formatCurrency(parseFloat(item.price), symbol, precision)}</td>
          <td style="text-align: right; padding: 6px; border-bottom: 1px solid #eee;">${formatCurrency(itemTotal, symbol, precision)}</td>
        </tr>`;
    }

    // Customer shipping coordinates
    const shippingAddress = order.shipping_address 
        ? `${order.shipping_address.address_line1}${order.shipping_address.address_line2 ? ', ' + order.shipping_address.address_line2 : ''}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}, ${order.shipping_address.country || 'India'}`
        : 'No shipping address provided';

    // Placeholder lookup
    const replacements: Record<string, string> = {
        invoiceNumber: order.order_number ? order.order_number.replace('ORD', taxConfig.invoicePrefix || 'INV-') : 'INV-TEMP',
        invoiceDate: new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        customerName: order.shipping_address?.full_name || order.profiles?.full_name || 'Guest Customer',
        customerEmail: order.profiles?.email || 'N/A',
        customerPhone: order.shipping_address?.phone || order.profiles?.phone || 'N/A',
        customerAddress: shippingAddress,
        companyName: header.companyName || 'Root & Loom',
        companyAddress: header.companyAddress || '',
        companyGST: header.gstNumber || 'N/A',
        companyPAN: header.panNumber || 'N/A',
        companyCIN: header.cinNumber || 'N/A',
        companyLogo: header.companyLogo || 'https://elnlegunapxogcovwqcs.supabase.co/storage/v1/object/public/products/logo.png', // Fallback placeholder logo if not configured
        
        bankName: footer.bankName || '',
        bankAccountName: footer.bankAccountName || '',
        bankAccountNumber: footer.bankAccountNumber || '',
        bankIFSC: footer.bankIFSC || '',
        upiQRCode: footer.upiQRCode || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(`upi://pay?pa=${footer.upiQRCode || 'rootloom@okaxis'}&pn=${header.companyName || 'RootLoom'}&cu=INR`),
        signatureImage: footer.signatureImage || '',
        stampImage: footer.stampImage || '',
        termsAndConditions: footer.termsAndConditions || '',
        returnPolicy: footer.returnPolicy || '',
        footer: header.footerText || footer.footer || 'This is a computer generated invoice and does not require a physical signature.',
        
        items: itemsHtml,
        subtotal: formatCurrency(subtotal, symbol, precision),
        discount: formatCurrency(discountAmount, symbol, precision),
        shipping: shipping === 0 ? 'Free' : formatCurrency(shipping, symbol, precision),
        
        cgstRate: cgstRate.toString(),
        sgstRate: sgstRate.toString(),
        igstRate: igstRate.toString(),
        cgst: formatCurrency(cgstAmount, symbol, precision),
        sgst: formatCurrency(sgstAmount, symbol, precision),
        igst: formatCurrency(igstAmount, symbol, precision),
        tax: formatCurrency(totalTaxAmount, symbol, precision),
        
        grandTotal: formatCurrency(grossTotal, symbol, precision),
        paymentMethod: order.payment_id ? `Razorpay (${order.payment_id})` : 'N/A',
        paymentStatus: order.payment_status || 'Pending',
        orderId: order.order_number || 'N/A',
        notes: order.notes || 'No notes'
    };

    // Interpolate placeholders
    let compiled = htmlTemplate;
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        compiled = compiled.replace(regex, value);
    }

    return compiled;
}
