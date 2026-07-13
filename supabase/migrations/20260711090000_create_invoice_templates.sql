-- Create invoice_templates table
CREATE TABLE IF NOT EXISTS public.invoice_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create invoice_template_versions table
CREATE TABLE IF NOT EXISTS public.invoice_template_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid REFERENCES public.invoice_templates(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    html text NOT NULL,
    css text DEFAULT '',
    header jsonb NOT NULL DEFAULT '{}'::jsonb,
    footer jsonb NOT NULL DEFAULT '{}'::jsonb,
    tax_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    layout_config jsonb NOT NULL DEFAULT '[]'::jsonb,
    print_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create invoices table to store generated invoice snapshots
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
    invoice_number text UNIQUE NOT NULL,
    template_version_id uuid REFERENCES public.invoice_template_versions(id) ON DELETE SET NULL,
    invoice_date timestamptz DEFAULT now(),
    company_name text,
    company_address text,
    company_details jsonb NOT NULL DEFAULT '{}'::jsonb,
    tax_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    layout_config jsonb NOT NULL DEFAULT '[]'::jsonb,
    html_snapshot text,
    css_snapshot text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies for invoice_templates
CREATE POLICY "Admins can view templates" 
    ON public.invoice_templates FOR SELECT 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Super Admins can manage templates" 
    ON public.invoice_templates FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- Policies for invoice_template_versions
CREATE POLICY "Admins can view template versions" 
    ON public.invoice_template_versions FOR SELECT 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Super Admins can manage template versions" 
    ON public.invoice_template_versions FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- Policies for invoices
CREATE POLICY "Users can view own invoices" 
    ON public.invoices FOR SELECT 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.orders WHERE id = invoices.order_id AND user_id = auth.uid()));

CREATE POLICY "Admins can manage all invoices" 
    ON public.invoices FOR ALL 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

-- Create storage bucket for invoice assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-assets', 'invoice-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Read Invoice Assets"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'invoice-assets' );

CREATE POLICY "Admins Manage Invoice Assets"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'invoice-assets' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin'))
)
WITH CHECK (
  bucket_id = 'invoice-assets' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin'))
);

-- Update trigger for updated_at on invoices
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed Default Templates and Versions
DO $$
DECLARE
    v_classic_id uuid := gen_random_uuid();
    v_modern_id uuid := gen_random_uuid();
    v_minimal_id uuid := gen_random_uuid();
    v_header jsonb;
    v_footer jsonb;
    v_tax jsonb;
    v_layout jsonb;
    v_print jsonb;
BEGIN
    -- Configure Default JSON Data
    v_header := '{
        "email": "root@rootloom.in",
        "phone": "+91 98765 43210",
        "website": "www.rootloom.in",
        "panNumber": "ABCDE1234F",
        "gstNumber": "24ABCDE1234F1Z2",
        "cinNumber": "U12345GJ2024PTC123456",
        "companyName": "Root & Loom Private Limited",
        "companyLogo": "",
        "companyAddress": "Shri Ram Folding Works, Shed 19, Narol, Ahmedabad, Gujarat 382405"
    }'::jsonb;

    v_footer := '{
        "bankIFSC": "SBIN0001234",
        "bankName": "State Bank of India",
        "upiQRCode": "",
        "stampImage": "",
        "returnPolicy": "Items can be returned within 14 days of delivery if they are unused and in original packaging.",
        "signatureImage": "",
        "bankAccountName": "Root & Loom Private Limited",
        "bankAccountNumber": "123456789012",
        "termsAndConditions": "1. Goods once sold will not be taken back. 2. All disputes are subject to Ahmedabad jurisdiction. 3. Interest @ 18% p.a. will be charged if payment is not made within 15 days."
    }'::jsonb;

    v_tax := '{
        "vat": 0,
        "cgst": 9,
        "igst": 18,
        "sgst": 9,
        "currency": "INR",
        "discount": 0,
        "serviceTax": 0,
        "invoicePrefix": "INV-",
        "currencySymbol": "₹",
        "shippingCharges": 0,
        "decimalPrecision": 2,
        "invoiceNumberFormat": "YYYYMMDD-####"
    }'::jsonb;

    v_layout := '[
        {"id": "header", "name": "Company Header", "visible": true},
        {"id": "customer", "name": "Customer Details", "visible": true},
        {"id": "items", "name": "Items Table", "visible": true},
        {"id": "totals", "name": "Tax Section", "visible": true},
        {"id": "payment", "name": "Payment Details", "visible": true},
        {"id": "notes", "name": "Notes", "visible": true},
        {"id": "signature", "name": "Signature & Stamp", "visible": true},
        {"id": "terms", "name": "Terms & Conditions", "visible": true},
        {"id": "footer", "name": "Footer", "visible": true}
    ]'::jsonb;

    v_print := '{
        "margins": {"top": 10, "left": 10, "right": 10, "bottom": 10},
        "watermark": "",
        "paperSize": "A4",
        "pageNumber": true,
        "logoPosition": "left",
        "orientation": "portrait",
        "qrCodePosition": "left",
        "signaturePosition": "right"
    }'::jsonb;

    -- Insert Template Metadatas
    INSERT INTO public.invoice_templates (id, name, is_default) VALUES
    (v_classic_id, 'Classic', true),
    (v_modern_id, 'Modern', false),
    (v_minimal_id, 'Minimal', false);

    -- Insert Classic Version
    INSERT INTO public.invoice_template_versions 
    (template_id, version_number, html, css, header, footer, tax_config, layout_config, print_settings, status)
    VALUES (
        v_classic_id,
        1,
        '<div style="font-family: Arial, sans-serif; color: #333; padding: 10px; line-height: 1.4;">
  <!-- Header Section -->
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1c352d; padding-bottom: 15px; margin-bottom: 20px; align-items: center;">
    <div>
      <img src="{{companyLogo}}" style="max-height: 45px; max-width: 150px; margin-bottom: 8px;" />
      <h2 style="margin: 0; font-size: 18px; color: #1c352d;">{{companyName}}</h2>
      <p style="margin: 2px 0; font-size: 10px; color: #666;">{{companyAddress}}</p>
      <p style="margin: 2px 0; font-size: 10px; color: #666;">GSTIN: {{companyGST}} | PAN: {{companyPAN}} | CIN: {{companyCIN}}</p>
    </div>
    <div style="text-align: right;">
      <h1 style="margin: 0 0 10px 0; font-size: 26px; color: #1c352d; letter-spacing: 1px;">TAX INVOICE</h1>
      <p style="margin: 2px 0; font-size: 10px;"><strong>Invoice No:</strong> {{invoiceNumber}}</p>
      <p style="margin: 2px 0; font-size: 10px;"><strong>Date:</strong> {{invoiceDate}}</p>
      <p style="margin: 2px 0; font-size: 10px;"><strong>Order ID:</strong> {{orderId}}</p>
    </div>
  </div>

  <!-- Customer Section -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
    <div style="width: 48%;">
      <h3 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #1c352d; border-bottom: 1px solid #ddd; padding-bottom: 4px; font-weight: bold;">Billed To</h3>
      <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">{{customerName}}</p>
      <p style="margin: 2px 0; font-size: 10px; color: #444;">{{customerAddress}}</p>
      <p style="margin: 2px 0; font-size: 10px; color: #444;">Phone: {{customerPhone}}</p>
      <p style="margin: 2px 0; font-size: 10px; color: #444;">Email: {{customerEmail}}</p>
    </div>
    <div style="width: 48%;">
      <h3 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #1c352d; border-bottom: 1px solid #ddd; padding-bottom: 4px; font-weight: bold;">Payment details</h3>
      <p style="margin: 2px 0; font-size: 10px;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <p style="margin: 2px 0; font-size: 10px;"><strong>Payment Status:</strong> {{paymentStatus}}</p>
    </div>
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
    <thead>
      <tr style="background-color: #f3f4f6; border-bottom: 2px solid #ccc; color: #1c352d;">
        <th style="text-align: left; padding: 8px; font-weight: bold;">Item Description</th>
        <th style="text-align: center; padding: 8px; font-weight: bold; width: 8%;">Qty</th>
        <th style="text-align: right; padding: 8px; font-weight: bold; width: 18%;">Unit Price</th>
        <th style="text-align: right; padding: 8px; font-weight: bold; width: 18%;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{items}}
    </tbody>
  </table>

  <!-- Summary Section -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; align-items: flex-start;">
    <div style="width: 50%;">
      <h4 style="margin: 0 0 5px 0; font-size: 10px; text-transform: uppercase; color: #1c352d; font-weight: bold;">Bank Details</h4>
      <p style="margin: 2px 0; font-size: 9px; color: #555;">Bank: {{bankName}} | A/c Name: {{bankAccountName}}</p>
      <p style="margin: 2px 0; font-size: 9px; color: #555;">A/c No: {{bankAccountNumber}} | IFSC: {{bankIFSC}}</p>
      <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
        <img src="{{upiQRCode}}" style="height: 50px; width: 50px;" />
        <p style="margin: 0; font-size: 8px; color: #666;">Scan to pay via UPI</p>
      </div>
    </div>
    <div style="width: 40%; background-color: #f9fafb; padding: 10px; border-radius: 4px; border: 1px solid #f3f4f6;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
        <span>Subtotal</span>
        <span>{{subtotal}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: #059669; font-weight: bold;">
        <span>Savings & Discount</span>
        <span>-{{discount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
        <span>Shipping</span>
        <span>{{shipping}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 9px; color: #666;">
        <span>Tax (GST Included)</span>
        <span>{{tax}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 6px; font-size: 12px; font-weight: bold; color: #1c352d;">
        <span>Grand Total</span>
        <span>{{grandTotal}}</span>
      </div>
    </div>
  </div>

  <!-- Signatures & Policies -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-end;">
    <div style="width: 58%; font-size: 8px; color: #666; line-height: 1.4;">
      <p style="margin: 0 0 3px 0; font-weight: bold; text-transform: uppercase; color: #444;">Terms & Conditions</p>
      <p style="margin: 0 0 6px 0;">{{termsAndConditions}}</p>
      <p style="margin: 0 0 3px 0; font-weight: bold; text-transform: uppercase; color: #444;">Return Policy</p>
      <p style="margin: 0;">{{returnPolicy}}</p>
    </div>
    <div style="width: 35%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
      <div style="position: relative; height: 50px; margin-bottom: 2px;">
        <img src="{{stampImage}}" style="height: 40px; opacity: 0.7; position: absolute; left: -10px; top: 0;" />
        <img src="{{signatureImage}}" style="height: 35px; position: relative; z-index: 2;" />
      </div>
      <p style="margin: 0; font-size: 9px; border-top: 1px solid #bbb; padding-top: 3px; width: 100%;">Authorized Signatory</p>
    </div>
  </div>

  <!-- Footer Text -->
  <div style="text-align: center; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px; font-size: 8px; color: #888;">
    {{footer}}
  </div>
</div>',
        'body { background: white; }',
        v_header,
        v_footer,
        v_tax,
        v_layout,
        v_print,
        'active'
    );

    -- Insert Modern Version
    INSERT INTO public.invoice_template_versions 
    (template_id, version_number, html, css, header, footer, tax_config, layout_config, print_settings, status)
    VALUES (
        v_modern_id,
        1,
        '<div style="font-family: Helvetica, sans-serif; color: #2d3748; padding: 10px; line-height: 1.5;">
  <!-- Header Banner -->
  <div style="background-color: #1a202c; color: white; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <div>
      <img src="{{companyLogo}}" style="max-height: 40px; max-width: 150px; filter: brightness(0) invert(1); margin-bottom: 6px;" />
      <h2 style="margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">{{companyName}}</h2>
      <p style="margin: 2px 0; font-size: 9px; opacity: 0.85;">{{companyAddress}}</p>
      <p style="margin: 2px 0; font-size: 9px; opacity: 0.85;">GSTIN: {{companyGST}} | PAN: {{companyPAN}}</p>
    </div>
    <div style="text-align: right;">
      <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7;">Invoice</span>
      <h1 style="margin: 2px 0 6px 0; font-size: 20px; font-weight: bold;">#{{invoiceNumber}}</h1>
      <p style="margin: 2px 0; font-size: 9px; opacity: 0.85;">Date: {{invoiceDate}}</p>
    </div>
  </div>

  <!-- Customer Billing details -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background-color: #f7fafc; padding: 12px; border-radius: 6px;">
    <div style="width: 48%;">
      <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #718096; display: block; margin-bottom: 4px;">Bill & Ship To</span>
      <p style="margin: 0; font-size: 11px; font-weight: bold; color: #1a202c;">{{customerName}}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #4a5568;">{{customerAddress}}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #4a5568;">Phone: {{customerPhone}}</p>
    </div>
    <div style="width: 48%; text-align: right;">
      <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #718096; display: block; margin-bottom: 4px;">Payment Reference</span>
      <p style="margin: 0; font-size: 10px;">Method: {{paymentMethod}}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold; color: #319795;">Status: {{paymentStatus}}</p>
      <p style="margin: 2px 0 0 0; font-size: 10px; color: #718096;">Order ID: {{orderId}}</p>
    </div>
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
    <thead>
      <tr style="border-bottom: 2px solid #e2e8f0; color: #4a5568;">
        <th style="text-align: left; padding: 8px 4px; font-weight: bold;">Items</th>
        <th style="text-align: center; padding: 8px 4px; font-weight: bold; width: 8%;">Qty</th>
        <th style="text-align: right; padding: 8px 4px; font-weight: bold; width: 18%;">Price</th>
        <th style="text-align: right; padding: 8px 4px; font-weight: bold; width: 18%;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{items}}
    </tbody>
  </table>

  <!-- Totals / Payment scan -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
    <div style="width: 50%; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
      <span style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #718096; display: block; margin-bottom: 4px;">Bank Info & UPI</span>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Bank:</strong> {{bankName}} | {{bankAccountName}}</p>
      <p style="margin: 2px 0; font-size: 9px;"><strong>A/c:</strong> {{bankAccountNumber}} | <strong>IFSC:</strong> {{bankIFSC}}</p>
      <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
        <img src="{{upiQRCode}}" style="height: 45px; width: 45px;" />
        <span style="font-size: 8px; color: #718096;">Scan via preferred UPI app to pay invoice</span>
      </div>
    </div>
    <div style="width: 42%;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
        <span style="color: #718096;">Subtotal</span>
        <span style="font-weight: bold;">{{subtotal}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: #38a169;">
        <span>Savings & Discount</span>
        <span>-{{discount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px;">
        <span style="color: #718096;">Shipping</span>
        <span>{{shipping}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9px; color: #a0aec0;">
        <span>Tax (Includes GST)</span>
        <span>{{tax}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 2px solid #1a202c; padding-top: 8px; font-size: 13px; font-weight: bold; color: #1a202c;">
        <span>Total Amount</span>
        <span>{{grandTotal}}</span>
      </div>
    </div>
  </div>

  <!-- Footer Policies -->
  <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 15px; align-items: flex-end;">
    <div style="width: 60%; font-size: 8px; color: #718096; line-height: 1.4;">
      <p style="margin: 0 0 2px 0; font-weight: bold; text-transform: uppercase; color: #4a5568;">Terms of Service</p>
      <p style="margin: 0 0 6px 0;">{{termsAndConditions}}</p>
      <p style="margin: 0 0 2px 0; font-weight: bold; text-transform: uppercase; color: #4a5568;">Return & Refund Policy</p>
      <p style="margin: 0;">{{returnPolicy}}</p>
    </div>
    <div style="width: 30%; text-align: center; border: 1px dashed #cbd5e0; padding: 6px; border-radius: 4px;">
      <div style="position: relative; height: 35px; margin-bottom: 2px;">
        <img src="{{stampImage}}" style="height: 30px; opacity: 0.6; position: absolute; left: 10px; top: 0;" />
        <img src="{{signatureImage}}" style="height: 30px; position: relative; z-index: 2;" />
      </div>
      <span style="font-size: 8px; color: #718096; display: block; border-top: 1px solid #e2e8f0; padding-top: 2px; margin-top: 2px;">Authorized Officer</span>
    </div>
  </div>

  <!-- Bottom Message -->
  <div style="text-align: center; margin-top: 25px; font-size: 8px; color: #a0aec0;">
    {{footer}}
  </div>
</div>',
        'body { background: #fafafa; }',
        v_header,
        v_footer,
        v_tax,
        v_layout,
        v_print,
        'active'
    );

    -- Insert Minimal Version
    INSERT INTO public.invoice_template_versions 
    (template_id, version_number, html, css, header, footer, tax_config, layout_config, print_settings, status)
    VALUES (
        v_minimal_id,
        1,
        '<div style="font-family: Georgia, serif; color: #000; padding: 10px; line-height: 1.4;">
  <!-- Title / Logo Header -->
  <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 20px; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 24px; font-weight: normal; letter-spacing: 2px;">{{companyName}}</h1>
    <p style="margin: 4px 0 0 0; font-size: 9px; font-style: italic; color: #555;">{{companyAddress}}</p>
    <p style="margin: 2px 0 0 0; font-size: 9px; color: #555;">GST: {{companyGST}} | Email: {{companyEmail}}</p>
  </div>

  <!-- Metadata Details -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 10px;">
    <div>
      <span style="text-transform: uppercase; font-weight: bold; color: #666; font-size: 8px; display: block; margin-bottom: 2px;">Billed To</span>
      <strong>{{customerName}}</strong><br />
      {{customerAddress}}<br />
      {{customerPhone}}
    </div>
    <div style="text-align: right;">
      <span style="text-transform: uppercase; font-weight: bold; color: #666; font-size: 8px; display: block; margin-bottom: 2px;">Invoice Record</span>
      <strong>Invoice No:</strong> #{{invoiceNumber}}<br />
      <strong>Date:</strong> {{invoiceDate}}<br />
      <strong>Order ID:</strong> {{orderId}}
    </div>
  </div>

  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 10px;">
    <thead>
      <tr style="border-bottom: 1px solid #000; text-transform: uppercase; font-size: 9px;">
        <th style="text-align: left; padding: 6px 0; font-weight: bold;">Description</th>
        <th style="text-align: center; padding: 6px 0; font-weight: bold; width: 8%;">Qty</th>
        <th style="text-align: right; padding: 6px 0; font-weight: bold; width: 18%;">Price</th>
        <th style="text-align: right; padding: 6px 0; font-weight: bold; width: 18%;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{items}}
    </tbody>
  </table>

  <!-- Total Summary -->
  <div style="display: flex; justify-content: flex-end; margin-bottom: 30px; font-size: 10px;">
    <div style="width: 35%; border-top: 1px solid #ccc; padding-top: 10px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>Subtotal</span>
        <span>{{subtotal}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-style: italic;">
        <span>Discount</span>
        <span>-{{discount}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>Shipping</span>
        <span>{{shipping}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 9px; color: #666;">
        <span>Included Tax</span>
        <span>{{tax}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #000; padding-top: 6px; font-weight: bold;">
        <span>Grand Total</span>
        <span>{{grandTotal}}</span>
      </div>
    </div>
  </div>

  <!-- Bank & Signature Details -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 9px;">
    <div style="width: 55%;">
      <strong>Remittance Details:</strong><br />
      Bank: {{bankName}} | A/c No: {{bankAccountNumber}}<br />
      IFSC: {{bankIFSC}} | Account Name: {{bankAccountName}}<br />
      UPI ID: {{upiQRCode}} (Scan QR in visual template)
    </div>
    <div style="width: 35%; text-align: center;">
      <div style="height: 35px; border-bottom: 1px solid #000; margin-bottom: 4px;">
        <img src="{{signatureImage}}" style="height: 30px;" />
      </div>
      <span>Authorized Signature</span>
    </div>
  </div>

  <!-- Policies Section -->
  <div style="border-top: 1px solid #000; padding-top: 10px; font-size: 8px; color: #555; line-height: 1.3;">
    <strong>Notice:</strong> {{termsAndConditions}}<br />
    <strong>Returns:</strong> {{returnPolicy}}<br />
    <div style="text-align: center; margin-top: 10px; font-style: italic; color: #888;">
      {{footer}}
    </div>
  </div>
</div>',
        'body { background: white; }',
        v_header,
        v_footer,
        v_tax,
        v_layout,
        v_print,
        'active'
    );
END $$;
