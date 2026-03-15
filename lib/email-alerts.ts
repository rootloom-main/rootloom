import { Resend } from 'resend';

// Initialize lazily
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Admin email (moving to env var for production readiness)
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || 'pamdeysamir@gmail.com';

interface InventoryAlertProps {
  productName: string;
  variant: string; // e.g. "Size: M, Color: Red"
  remainingStock: number;
  productId: string;
}

export const sendInventoryAlertEmail = async ({
  productName,
  variant,
  remainingStock,
  productId,
}: InventoryAlertProps) => {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set. Skipping inventory alert.');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Root&Loom Alerts <alerts@rootloom.in>',
      to: [ADMIN_EMAIL],
      subject: `⚠️ Low Stock Alert: ${productName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #d9534f;">Low Inventory Warning</h2>
          <p>The following item has dropped below the low stock threshold (5 units):</p>
          
          <table style="width: 100%; margin: 20px 0;">
            <tr>
              <td style="font-weight: bold; width: 30%;">Product:</td>
              <td>${productName}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Variant:</td>
              <td>${variant}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Remaining Stock:</td>
              <td style="color: #d9534f; font-weight: bold;">${remainingStock}</td>
            </tr>
          </table>

          <div style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/inventory" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">manage Inventory</a>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Inventory alert email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending inventory alert:', error);
    return { success: false, error };
  }
};
