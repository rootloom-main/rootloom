import { Resend } from 'resend';

// Initialize lazily or with a check to prevent build errors
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Allow environment variable to override the "from" address for testing or unverified domains
const DEFAULT_FROM = process.env.RESEND_FROM_ADDRESS || 'Root & Loom <orders@rootloom.in>';
// In development, if no custom FROM is set, we might want to default to onboarding@resend.dev 
// but ONLY if the user is testing. For simplicity, we'll keep the configured one but allow override.

function emailErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Email provider request failed';
}

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
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
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
      <p>Root & Loom | Rooted in Vibes. Loomed for the Journey.</p>
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
  idempotencyKey?: string;
}

export const sendAbandonedCartEmail = async ({
  customerName,
  customerEmail,
  cartUrl,
  items,
  tier = '1hr',
  idempotencyKey,
}: AbandonedCartEmailProps) => {
  if (!resend) return { success: false, error: 'Email service not configured' };

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
      from: DEFAULT_FROM,
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
      <p style="margin-top: 20px;">Root & Loom | Rooted in Vibes. Loomed for the Journey.</p>
    </div>
  </div>
</body>
</html>
      `
    }, idempotencyKey ? { idempotencyKey } : undefined);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const sendOtpEmail = async (email: string, code: string) => {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set. Skipping OTP email.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [email],
      subject: `${code} is your Root & Loom verification code`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9F8F6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #F9F8F6; padding-bottom: 40px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E5E1DA; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { padding: 40px 40px 20px; text-align: center; }
    .logo { font-size: 20px; font-weight: 700; letter-spacing: 0.15em; color: #1A231D; text-decoration: none; text-transform: uppercase; display: inline-block; margin-bottom: 10px; }
    .content { padding: 0 40px 40px; text-align: center; }
    .title { font-size: 24px; font-weight: 500; color: #1A231D; margin-bottom: 16px; letter-spacing: -0.01em; }
    .message { font-size: 16px; color: #5C5C5C; line-height: 1.6; margin-bottom: 32px; }
    .code-container { margin: 32px 0; background: #F9F8F6; padding: 24px; border-radius: 12px; border: 1px solid #E5E1DA; display: inline-block; min-width: 200px; }
    .code { font-size: 32px; font-weight: 700; color: #1A231D; letter-spacing: 0.2em; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .footer { padding: 32px 40px; background-color: #FBFBFA; border-top: 1px solid #E5E1DA; text-align: center; }
    .footer-text { font-size: 12px; color: #8F8F8F; line-height: 1.8; margin-bottom: 8px; }
    @media (prefers-color-scheme: dark) {
      body, .wrapper { background-color: #121212 !important; }
      .container { background-color: #1C1C1C !important; border-color: #2D2D2D !important; }
      .logo, .title { color: #FFFFFF !important; }
      .message { color: #A3A3A3 !important; }
      .code-container { background: #242424 !important; border-color: #333333 !important; }
      .code { color: #FFFFFF !important; }
      .footer { background-color: #181818 !important; border-color: #2D2D2D !important; }
      .footer-text { color: #8F8F8F !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}" class="logo">Root & Loom</a>
      </div>
      <div class="content">
        <h1 class="title">Verification Code</h1>
        <p class="message">Enter the following code to sign in to your Root & Loom account. This code is valid for 10 minutes.</p>
        <div class="code-container">
          <span class="code">${code}</span>
        </div>
        <p class="footer-text" style="margin-top: 32px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p class="footer-text"><strong>Root & Loom</strong><br>Rooted in Vibes. Loomed for the Journey.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('Resend OTP error:', error);
      return { success: false, error: emailErrorMessage(error) };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: emailErrorMessage(error) };
  }
};

export const sendMagicLinkEmail = async (email: string, link: string) => {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set. Skipping magic link email.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [email],
      subject: 'Sign in to Root & Loom',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Root & Loom</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F9F8F6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #F9F8F6; padding-bottom: 40px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E5E1DA; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { padding: 40px 40px 20px; text-align: center; }
    .logo { font-size: 20px; font-weight: 700; letter-spacing: 0.15em; color: #1A231D; text-decoration: none; text-transform: uppercase; display: inline-block; margin-bottom: 10px; }
    .content { padding: 0 40px 40px; text-align: center; }
    .title { font-size: 24px; font-weight: 500; color: #1A231D; margin-bottom: 16px; letter-spacing: -0.01em; }
    .message { font-size: 16px; color: #5C5C5C; line-height: 1.6; margin-bottom: 32px; }
    .btn-container { margin: 32px 0; }
    .btn { display: inline-block; padding: 16px 36px; background-color: #1A231D; color: #FFFFFF !important; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 12px; letter-spacing: 0.02em; }
    .footer { padding: 32px 40px; background-color: #FBFBFA; border-top: 1px solid #E5E1DA; text-align: center; }
    .footer-text { font-size: 12px; color: #8F8F8F; line-height: 1.8; margin-bottom: 8px; }
    .link-alt { font-size: 11px; color: #A3A3A3; word-break: break-all; margin: 20px 0 0; padding: 12px; background: #F5F5F3; border-radius: 8px; }
    @media (prefers-color-scheme: dark) {
      body, .wrapper { background-color: #121212 !important; }
      .container { background-color: #1C1C1C !important; border-color: #2D2D2D !important; }
      .logo, .title { color: #FFFFFF !important; }
      .message { color: #A3A3A3 !important; }
      .btn { background-color: #FFFFFF !important; color: #1A231D !important; }
      .footer { background-color: #181818 !important; border-color: #2D2D2D !important; }
      .footer-text { color: #666666 !important; }
      .link-alt { background: #242424 !important; color: #555555 !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}" class="logo">Root & Loom</a>
      </div>
      <div class="content">
        <h1 class="title">Secure Sign In</h1>
        <p class="message">Welcome back. Click the button below to sign in securely to your Root & Loom account. This link will expire in 1 hour.</p>
        <div class="btn-container"><a href="${link}" class="btn">Confirm Sign In</a></div>
        <p class="footer-text" style="margin-top: 32px;">If you didn't request this email, you can safely ignore it.</p>
      </div>
      <div class="footer">
        <p class="footer-text"><strong>Root & Loom</strong><br>Rooted in Vibes. Loomed for the Journey.</p>
        <div class="link-alt">Trouble with the button? Copy and paste this URL into your browser:<br><span style="display: block; margin-top: 4px;">${link}</span></div>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('Resend magic link error:', error);
      return { success: false, error: (error as any).message || 'Unknown Resend error' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return { success: false, error };
  }
};
