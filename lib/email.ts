import { Resend } from 'resend';

// Initialize lazily or with a check to prevent build errors
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface OrderEmailProps {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
}

export const sendOrderConfirmationEmail = async ({
  orderNumber,
  customerName,
  customerEmail,
  totalAmount,
  items,
}: OrderEmailProps) => {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set. Skipping email sending.');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Root&Loom <orders@rootloom.com>', // Update this with your verified domain
      to: [customerEmail],
      subject: `Order Confirmation #${orderNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Thank you for your order, ${customerName}!</h1>
          <p>We have received your order <strong>#${orderNumber}</strong> and it is being processed.</p>
          
          <h2>Order Summary</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #ddd; text-align: left;">
                <th style="padding: 10px 0;">Item</th>
                <th style="padding: 10px 0;">Qty</th>
                <th style="padding: 10px 0;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${items
          .map(
            (item) => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0;">${item.name}</td>
                  <td style="padding: 10px 0;">${item.quantity}</td>
                  <td style="padding: 10px 0;">${item.price}</td>
                </tr>
              `
          )
          .join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px 0; font-weight: bold;">Total</td>
                <td style="padding: 10px 0; font-weight: bold;">${totalAmount}</td>
              </tr>
            </tfoot>
          </table>

          <p style="margin-top: 30px;">
            You can view your order details <a href="${process.env.NEXT_PUBLIC_SITE_URL
        }/account/orders/${orderNumber}">here</a>.
          </p>
          
          <p>Best regards,<br>Root&Loom Team</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

interface AbandonedCartEmailProps {
  customerName: string;
  customerEmail: string;
  cartUrl: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  tier?: '1hr' | '6hr' | '24hr';
}

export const sendAbandonedCartEmail = async ({
  customerName,
  customerEmail,
  cartUrl,
  items,
  tier = '1hr'
}: AbandonedCartEmailProps) => {
  if (!resend) return;

  let subject = 'You left something behind! 🛒';
  let headerText = 'We noticed you left some items in your cart. They are selling out fast!';
  let promoText = '';

  if (tier === '6hr') {
    subject = 'Your cart is waiting for you! ⏳';
    headerText = 'Your items are still waiting, but stock is limited. Secure them before they are gone!';
  } else if (tier === '24hr') {
    subject = 'Final Call! Take 10% OFF your cart ✨';
    headerText = 'We saved your cart! As a special treat, use code COMEBACK10 at checkout to get 10% off your entire order.';
    promoText = '<div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; border: 2px dashed #000;">COMEBACK10</div>';
  }

  try {
    await resend.emails.send({
      from: 'Root&Loom <orders@rootloom.com>',
      to: [customerEmail],
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Hi ${customerName},</h1>
          <p>${headerText}</p>
          ${promoText}
          
          <div style="margin: 20px 0; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
            ${items.map(item => `
              <div style="display: flex; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f5f5f5;">
                ${item.image ? `<img src="${item.image}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 15px; border-radius: 4px;" />` : ''}
                <div>
                  <div style="font-weight: bold;">${item.name}</div>
                  <div style="color: #666;">Qty: ${item.quantity} | ₹${item.price}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cartUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Return to Cart</a>
          </div>
          
          <p style="text-align: center; color: #888; font-size: 12px;">
            If the button doesn't work, copy this link: ${cartUrl}
          </p>
        </div>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending abandoned cart email:', error);
    return { success: false, error };
  }
};
