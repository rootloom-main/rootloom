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
      from: 'Root & Loom <orders@rootloom.com>',
      to: [customerEmail],
      subject: `Order Confirmation #${orderNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 40px; border: 1px solid #eaeaea; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1F2F26; text-decoration: none; }
    .title { font-size: 20px; font-weight: 300; color: #333333; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px; }
    .greeting { font-size: 16px; color: #444444; line-height: 1.5; margin-bottom: 30px; text-align: center; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { border-bottom: 2px solid #1F2F26; padding: 12px 0; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #1F2F26; }
    .table td { padding: 16px 0; border-bottom: 1px solid #eaeaea; font-size: 14px; color: #333; }
    .total-row td { padding-top: 20px; font-size: 16px; font-weight: bold; color: #1F2F26; border-bottom: none; }
    .btn { display: inline-block; padding: 14px 30px; background-color: #1F2F26; color: #ffffff; text-decoration: none; font-size: 14px; letter-spacing: 1px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999999; line-height: 1.5; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}" class="logo">ROOT & LOOM</a>
      <div class="title">Order Confirmed</div>
    </div>
    
    <div class="greeting">
      Thank you for your purchase, ${customerName}.<br>
      Your order <strong>#${orderNumber}</strong> has been received and is currently being processed.
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${item.price}</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2" style="text-align: right; padding-right: 20px;">Total</td>
          <td style="text-align: right;">${totalAmount}</td>
        </tr>
      </tbody>
    </table>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/account/orders/${orderNumber}" class="btn">VIEW ORDER STATUS</a>
    </div>

    <div class="footer">
      <p>Root & Loom | Sustainable Luxury Fashion</p>
      <p>If you have any questions, reply to this email or contact support.</p>
    </div>
  </div>
</body>
</html>
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
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; padding: 40px; border: 1px solid #eaeaea; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1F2F26; text-decoration: none; }
    .greeting { font-size: 16px; color: #444444; line-height: 1.6; margin-bottom: 30px; text-align: center; }
    .promo { background-color: #1F2F26; color: #ffffff; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; letter-spacing: 2px; border-radius: 4px; }
    .cart-items { margin: 20px 0; padding: 20px; border: 1px solid #eaeaea; }
    .item-row { display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f5f5f5; }
    .item-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .item-img { width: 60px; height: 60px; object-fit: cover; margin-right: 20px; border-radius: 4px; border: 1px solid #eee; }
    .item-name { font-weight: bold; font-size: 14px; color: #333; margin-bottom: 5px; }
    .item-meta { color: #666; font-size: 13px; }
    .btn { display: inline-block; padding: 16px 32px; background-color: #1F2F26; color: #ffffff; text-decoration: none; font-size: 14px; letter-spacing: 1px; font-weight: bold; margin-top: 30px; }
    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999999; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}" class="logo">ROOT & LOOM</a>
    </div>
    
    <div class="greeting">
      Hi ${customerName},<br><br>
      ${headerText}
    </div>

    ${tier === '24hr' ? `<div class="promo">COMEBACK10</div>` : ''}

    <div class="cart-items">
      ${items.map(item => `
        <div class="item-row">
          ${item.image ? `<img src="${item.image}" class="item-img" />` : ''}
          <div>
            <div class="item-name">${item.name}</div>
            <div class="item-meta">Qty: ${item.quantity} | ₹${item.price.toFixed(2)}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="text-align: center;">
      <a href="${cartUrl}" class="btn">RETURN TO CART</a>
    </div>

    <div class="footer">
      <p>If the button doesn't work, copy this link: ${cartUrl}</p>
      <p style="margin-top: 20px;">Root & Loom | Sustainable Luxury Fashion</p>
    </div>
  </div>
</body>
</html>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending abandoned cart email:', error);
    return { success: false, error };
  }
};
