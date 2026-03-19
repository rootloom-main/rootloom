import twilio from 'twilio';

const BRAND = 'Root & Loom';
const SUPPORT_REPLY = 'Reply to this message for support — our team is here to help.';

// Brand logo served from public domain — used as media image in WhatsApp messages.
// Twilio requires a publicly accessible HTTPS URL for mediaUrl.
function getBrandLogoUrl(): string | undefined {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl || siteUrl.includes('localhost')) {
        // Twilio can't fetch localhost URLs — skip media in local dev
        return undefined;
    }
    return `${siteUrl}/icons/icon-512x512.png`;
}

function getSiteUrl(): string {
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://rootloom.com';
}

/**
 * Ensures the phone number is in E.164 WhatsApp format.
 * Assumes Indian (+91) if 10 digits with no country code.
 */
export function formatWhatsAppNumber(phone: string): string | null {
    if (!phone) return null;

    let cleaned = phone.replace(/[^\d+]/g, '');

    if (!cleaned.startsWith('+')) {
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        if (cleaned.length === 10) {
            cleaned = `+91${cleaned}`;
        } else if (cleaned.length > 10) {
            cleaned = `+${cleaned}`;
        }
    }

    // Final validation: must be at least 10 digits after the '+'
    if (!/^\+\d{10,15}$/.test(cleaned)) {
        return null;
    }

    return `whatsapp:${cleaned}`;
}

/**
 * Core Twilio WhatsApp send function.
 * Supports optional mediaUrl for image-rich messages.
 */
export async function sendWhatsAppMessage(
    to: string | null | undefined,
    body: string,
    mediaUrl?: string
): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
        console.warn('[WhatsApp] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN — message skipped.');
        return false;
    }

    if (!to) {
        console.warn('[WhatsApp] No recipient phone number provided.');
        return false;
    }

    const formattedTo = formatWhatsAppNumber(to);
    if (!formattedTo) {
        console.warn(`[WhatsApp] Invalid phone number: "${to}" — could not format to E.164.`);
        return false;
    }

    try {
        const client = twilio(accountSid, authToken);

        const messageOptions: Record<string, any> = {
            body,
            from: fromPhoneNumber,
            to: formattedTo,
        };

        // Attach media image if URL is provided (must be a public HTTPS URL)
        if (mediaUrl) {
            messageOptions.mediaUrl = [mediaUrl];
        }

        const result = await client.messages.create(messageOptions as any);
        console.log(`[WhatsApp] ✓ Sent to ${formattedTo} | SID: ${result.sid}`);
        return true;
    } catch (error: any) {
        console.error(`[WhatsApp] ✗ Failed to ${formattedTo}: ${error.message}`);
        return false;
    }
}

// ─────────────────────────────────────────────
//  ORDER CONFIRMED (Prepaid / COD)
// ─────────────────────────────────────────────
/**
 * @param productImageUrl - Optional CDN URL of the first product in the order.
 *                          Falls back to brand logo if not provided.
 */
export async function sendOrderConfirmationWhatsApp(
    phone: string,
    customerName: string,
    orderNumber: string,
    total: string,
    isCOD: boolean = false,
    productImageUrl?: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const ordersUrl = `${getSiteUrl()}/account/orders`;
    const mediaUrl = productImageUrl || getBrandLogoUrl();

    const paymentLine = isCOD
        ? `💳 *Payment:* Cash on Delivery`
        : `💳 *Payment:* Paid Online ✅`;

    const body = [
        `🎉 *Order Confirmed — ${BRAND}*`,
        ``,
        `Hi ${firstName}! Your order has been placed successfully.`,
        ``,
        `📦 *Order:* #${orderNumber}`,
        `💰 *Total:* ₹${total}`,
        paymentLine,
        ``,
        `We're carefully preparing your items. You'll get another update once it ships.`,
        ``,
        `🔗 Track your order: ${ordersUrl}`,
        ``,
        SUPPORT_REPLY,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, mediaUrl);
}

// ─────────────────────────────────────────────
//  ORDER SHIPPED
// ─────────────────────────────────────────────
export async function sendOrderShippedWhatsApp(
    phone: string,
    customerName: string,
    orderNumber: string,
    trackingId?: string,
    courier?: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const ordersUrl = `${getSiteUrl()}/account/orders`;

    const trackingLine = trackingId
        ? `🔎 *Tracking #:* ${trackingId}${courier ? ` via ${courier}` : ''}`
        : `🔎 Track your shipment from our website below.`;

    const body = [
        `🚚 *Your Order Has Shipped — ${BRAND}*`,
        ``,
        `Great news, ${firstName}! Your order is on the way.`,
        ``,
        `📦 *Order:* #${orderNumber}`,
        trackingLine,
        ``,
        `Most orders arrive within *3–5 business days*.`,
        ``,
        `🔗 View shipment details: ${ordersUrl}`,
        ``,
        SUPPORT_REPLY,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl());
}

// ─────────────────────────────────────────────
//  OUT FOR DELIVERY
// ─────────────────────────────────────────────
export async function sendOutForDeliveryWhatsApp(
    phone: string,
    customerName: string,
    orderNumber: string
) {
    const firstName = customerName.split(' ')[0] || 'there';

    const body = [
        `🏠 *Out for Delivery — ${BRAND}*`,
        ``,
        `${firstName}, your order *#${orderNumber}* is out for delivery today! 🎉`,
        ``,
        `📍 Please ensure someone is available at the delivery address.`,
        `📵 Keep your phone reachable — the delivery partner may call.`,
        ``,
        `If you're unavailable, please reply to this message and we'll help reschedule.`,
        ``,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl());
}

// ─────────────────────────────────────────────
//  ORDER DELIVERED
// ─────────────────────────────────────────────
export async function sendOrderDeliveredWhatsApp(
    phone: string,
    customerName: string,
    orderNumber: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const ordersUrl = `${getSiteUrl()}/account/orders`;

    const body = [
        `✅ *Delivered! — ${BRAND}*`,
        ``,
        `Your order has arrived, ${firstName}! We hope you love it. 🤍`,
        ``,
        `📦 *Order:* #${orderNumber}`,
        ``,
        `💬 We'd love to hear what you think. Leave a review on the product page — it helps other customers and means a lot to our small team.`,
        ``,
        `🔗 Write a review: ${ordersUrl}`,
        ``,
        SUPPORT_REPLY,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl());
}

// ─────────────────────────────────────────────
//  ORDER CANCELLED
// ─────────────────────────────────────────────
export async function sendOrderCancelledWhatsApp(
    phone: string,
    customerName: string,
    orderNumber: string,
    refundNote?: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const shopUrl = `${getSiteUrl()}/shop`;

    const refundLine = refundNote
        ? `💰 *Refund:* ${refundNote}`
        : `💰 *Refund:* If paid online, your refund will be credited within *5–7 business days*.`;

    const body = [
        `❌ *Order Cancelled — ${BRAND}*`,
        ``,
        `Hi ${firstName}, your order *#${orderNumber}* has been cancelled.`,
        ``,
        refundLine,
        ``,
        `We're sorry things didn't work out. If there was an issue, please let us know — we'd love to make it right.`,
        ``,
        `🛍️ Continue shopping: ${shopUrl}`,
        ``,
        SUPPORT_REPLY,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl());
}

// ─────────────────────────────────────────────
//  RETURN / REFUND INITIATED
// ─────────────────────────────────────────────
export async function sendReturnInitiatedWhatsApp(
    phone: string,
    customerName: string,
    orderNumber: string,
    returnReason?: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const returnsUrl = `${getSiteUrl()}/account/orders`;

    const reasonLine = returnReason ? `\n📝 *Reason:* ${returnReason}` : '';

    const body = [
        `🔄 *Return Requested — ${BRAND}*`,
        ``,
        `Hi ${firstName}, we've received your return request for order *#${orderNumber}*.${reasonLine}`,
        ``,
        `Our team will review it within *24–48 hours*. Once approved, we'll share pickup details.`,
        ``,
        `💰 Refunds are processed within *5–7 business days* after we receive the item.`,
        ``,
        `🔗 Track your return: ${returnsUrl}`,
        ``,
        SUPPORT_REPLY,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl());
}

// ─────────────────────────────────────────────
//  ABANDONED CART RECOVERY
// ─────────────────────────────────────────────
export async function sendPaymentRecoveryNotification(
    phone: string,
    customerName: string,
    cartTotal: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const cartUrl = `${getSiteUrl()}/cart`;

    const body = [
        `🛒 *You left something behind — ${BRAND}*`,
        ``,
        `Hi ${firstName}! Your bag is still waiting for you.`,
        ``,
        `💰 *Cart Value:* ₹${cartTotal}`,
        ``,
        `⚡ Stock is limited — complete your order before someone else grabs your picks!`,
        ``,
        `🔗 Return to your cart: ${cartUrl}`,
        ``,
        SUPPORT_REPLY,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl());
}
