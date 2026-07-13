import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin, getCurrentUser } from '@/lib/utils/auth';

export const runtime = 'nodejs';

function isMissingInvoiceTemplateSchema(error: any) {
    const message = String(error?.message || error?.details || error?.hint || '');
    return (
        error?.code === 'PGRST205' ||
        error?.code === '42P01' ||
        message.includes('invoice_templates') ||
        message.includes('Could not find the table') ||
        message.includes('schema cache') ||
        message.includes('does not exist') ||
        message.includes('relation')
    );
}

function missingSchemaResponse(error: any) {
    return NextResponse.json(
        {
            error: error?.message || 'Invoice template tables are not available in the database schema cache.',
            setupRequired: true,
        },
        { status: 503 }
    );
}

// GET all templates
export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createAdminClient() as any;
    const { data: templates, error } = await supabase
        .from('invoice_templates')
        .select(`
            *,
            versions:invoice_template_versions (
                *
            )
        `)
        .order('created_at', { ascending: true }) as any;

    if (error) {
        console.error('Error fetching templates:', error);
        if (isMissingInvoiceTemplateSchema(error)) {
            return missingSchemaResponse(error);
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter versions client-side or parse them to only include the active version as a single object
    const formattedTemplates = templates.map((t: any) => {
        const activeVersion = t.versions?.find((v: any) => v.status === 'active') || null;
        return {
            ...t,
            active_version: activeVersion,
            versions: undefined // remove full list to save bandwidth
        };
    });

    return NextResponse.json(formattedTemplates);
}

// POST create new template
export async function POST(req: Request) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    try {
        const user = await getCurrentUser();
        const body = await req.json();
        const { name, is_default } = body;

        if (!name) {
            return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
        }

        const supabase = createAdminClient() as any;

        // If this template is set to default, unset other templates first
        if (is_default) {
            const { error: unsetError } = await supabase
                .from('invoice_templates')
                .update({ is_default: false })
                .eq('is_default', true);

            if (unsetError && isMissingInvoiceTemplateSchema(unsetError)) {
                return missingSchemaResponse(unsetError);
            }
        }

        // Insert template
        const { data: template, error: templateError } = await supabase
            .from('invoice_templates')
            .insert({ name, is_default: !!is_default })
            .select()
            .single() as any;

        if (templateError || !template) {
            if (isMissingInvoiceTemplateSchema(templateError)) {
                return missingSchemaResponse(templateError);
            }
            throw new Error(templateError?.message || 'Failed to create template metadata');
        }

        // Create Default Version 1
        const defaultHtml = `<div style="font-family: Arial, sans-serif; color: #333; padding: 10px; line-height: 1.4;">
  <!-- Header Section -->
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1c352d; padding-bottom: 12px; margin-bottom: 15px; align-items: center;">
    <div>
      <img src="{{companyLogo}}" style="max-height: 45px; max-width: 150px; margin-bottom: 8px;" />
      <h2 style="margin: 0; font-size: 16px; color: #1c352d;">{{companyName}}</h2>
      <p style="margin: 2px 0; font-size: 9px; color: #666;">{{companyAddress}}</p>
      <p style="margin: 2px 0; font-size: 9px; color: #666;">GSTIN: {{companyGST}} | PAN: {{companyPAN}}</p>
    </div>
    <div style="text-align: right;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #1c352d; letter-spacing: 1px;">TAX INVOICE</h1>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Invoice No:</strong> {{invoiceNumber}}</p>
      <p style="margin: 2px 0; font-size: 9px;"><strong>Date:</strong> {{invoiceDate}}</p>
    </div>
  </div>
  <!-- Items Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
    <thead>
      <tr style="background-color: #f3f4f6; border-bottom: 2px solid #ccc; color: #1c352d;">
        <th style="text-align: left; padding: 6px;">Item Description</th>
        <th style="text-align: center; padding: 6px; width: 8%;">Qty</th>
        <th style="text-align: right; padding: 6px; width: 18%;">Unit Price</th>
        <th style="text-align: right; padding: 6px; width: 18%;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{items}}
    </tbody>
  </table>
  <!-- Totals Section -->
  <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
    <div style="width: 40%; background-color: #f9fafb; padding: 8px; border-radius: 4px; border: 1px solid #f3f4f6;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 9px;">
        <span>Subtotal</span>
        <span>{{subtotal}}</span>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 5px; font-size: 11px; font-weight: bold; color: #1c352d;">
        <span>Grand Total</span>
        <span>{{grandTotal}}</span>
      </div>
    </div>
  </div>
</div>`;

        const defaultHeader = {
            companyName: 'Root & Loom',
            companyAddress: 'Shri Ram Folding Works, Shed 19, Narol, Ahmedabad, Gujarat 382405',
            email: 'root@rootloom.in',
            phone: '+91 98765 43210',
            website: 'www.rootloom.in',
            panNumber: '',
            gstNumber: '',
            cinNumber: ''
        };

        const defaultFooter = {
            bankName: '',
            bankAccountName: '',
            bankAccountNumber: '',
            bankIFSC: '',
            upiQRCode: '',
            stampImage: '',
            signatureImage: '',
            termsAndConditions: '',
            returnPolicy: ''
        };

        const defaultTax = {
            cgst: 9,
            sgst: 9,
            igst: 18,
            vat: 0,
            currency: 'INR',
            currencySymbol: '₹',
            decimalPrecision: 2,
            invoicePrefix: 'INV-',
            invoiceNumberFormat: 'YYYYMMDD-####'
        };

        const defaultLayout = [
            { id: 'header', visible: true, name: 'Company Header' },
            { id: 'customer', visible: true, name: 'Customer Details' },
            { id: 'items', visible: true, name: 'Items Table' },
            { id: 'totals', visible: true, name: 'Tax Section' },
            { id: 'payment', visible: true, name: 'Payment Details' },
            { id: 'signature', visible: true, name: 'Signature & Stamp' },
            { id: 'terms', visible: true, name: 'Terms & Conditions' },
            { id: 'footer', visible: true, name: 'Footer' }
        ];

        const defaultPrint = {
            paperSize: 'A4',
            orientation: 'portrait',
            margins: { top: 10, left: 10, right: 10, bottom: 10 }
        };

        const { data: version, error: versionError } = await supabase
            .from('invoice_template_versions')
            .insert({
                template_id: template.id,
                version_number: 1,
                html: defaultHtml,
                css: '',
                header: defaultHeader,
                footer: defaultFooter,
                tax_config: defaultTax,
                layout_config: defaultLayout,
                print_settings: defaultPrint,
                status: 'active',
                created_by: user?.id || null
            })
            .select()
            .single() as any;

        if (versionError) {
            if (isMissingInvoiceTemplateSchema(versionError)) {
                return missingSchemaResponse(versionError);
            }
            // Roll back template creation if version creation fails
            await supabase.from('invoice_templates').delete().eq('id', template.id);
            throw new Error(versionError.message);
        }

        return NextResponse.json({
            ...template,
            active_version: version
        });
    } catch (error: any) {
        console.error('Error creating template:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
