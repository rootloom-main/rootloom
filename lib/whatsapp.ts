import twilio from 'twilio';
import { recordOpsEvent } from '@/lib/ops-events';

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
    mediaUrl?: string,
    metadata: Record<string, any> = {}
): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
        console.warn('[WhatsApp] Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN - message skipped.');
        await recordOpsEvent({
            eventType: 'messaging.whatsapp',
            status: 'skipped',
            channel: 'whatsapp',
            reference: to || null,
            metadata: { reason: 'missing_twilio_credentials', ...metadata },
        });
        return false;
    }

    if (!to) {
        console.warn('[WhatsApp] No recipient phone number provided.');
        await recordOpsEvent({
            eventType: 'messaging.whatsapp',
            status: 'skipped',
            channel: 'whatsapp',
            metadata: { reason: 'missing_recipient', ...metadata },
        });
        return false;
    }

    const formattedTo = formatWhatsAppNumber(to);
    if (!formattedTo) {
        console.warn('[WhatsApp] Invalid phone number - could not format to E.164.');
        await recordOpsEvent({
            eventType: 'messaging.whatsapp',
            status: 'failed',
            channel: 'whatsapp',
            reference: to,
            metadata: { reason: 'invalid_phone', ...metadata },
        });
        return false;
    }

    try {
        const client = twilio(accountSid, authToken);

        const messageOptions: Record<string, any> = {
            body,
            from: fromPhoneNumber,
            to: formattedTo,
        };

        if (mediaUrl) {
            messageOptions.mediaUrl = [mediaUrl];
        }

        const result = await client.messages.create(messageOptions as any);
        console.info('[WhatsApp] Message sent successfully');
        await recordOpsEvent({
            eventType: 'messaging.whatsapp',
            status: 'success',
            channel: 'whatsapp',
            reference: formattedTo,
            metadata: { sid: result.sid, ...metadata },
        });
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        console.error('[WhatsApp] Failed to ' + formattedTo + ': ' + message);
        await recordOpsEvent({
            eventType: 'messaging.whatsapp',
            status: 'failed',
            channel: 'whatsapp',
            reference: formattedTo,
            metadata: { error: message, ...metadata },
        });
        await sendSmsFallback(to, body, metadata);
        return false;
    }
}

async function sendSmsFallback(
    to: string | null | undefined,
    body: string,
    metadata: Record<string, any> = {}
) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhoneNumber = process.env.TWILIO_SMS_NUMBER;

    if (!accountSid || !authToken || !fromPhoneNumber || !to) {
        return false;
    }

    const smsTo = formatWhatsAppNumber(to)?.replace('whatsapp:', '');
    if (!smsTo) {
        return false;
    }

    try {
        const client = twilio(accountSid, authToken);
        const result = await client.messages.create({
            body,
            from: fromPhoneNumber,
            to: smsTo,
        } as any);
        await recordOpsEvent({
            eventType: 'messaging.sms_fallback',
            status: 'success',
            channel: 'sms',
            reference: smsTo,
            metadata: { sid: result.sid, ...metadata },
        });
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        await recordOpsEvent({
            eventType: 'messaging.sms_fallback',
            status: 'failed',
            channel: 'sms',
            reference: smsTo,
            metadata: { error: message, ...metadata },
        });
        return false;
    }
}
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
    trackingUrl?: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const ordersUrl = `${getSiteUrl()}/account/orders`;

    const trackingLine = trackingId
        ? `🔎 *Tracking ID:* ${trackingId}`
        : `🔎 Tracking ID will be available on your order page.`;
    const trackingUrlLine = trackingUrl
        ? `🔗 *Tracking Link:* ${trackingUrl}`
        : `🔗 View shipment details: ${ordersUrl}`;

    const body = [
        `🚚 *Your Order Has Shipped — ${BRAND}*`,
        ``,
        `Great news, ${firstName}! Your order is on the way.`,
        ``,
        `📦 *Order:* #${orderNumber}`,
        trackingLine,
        trackingUrlLine,
        ``,
        `Most orders arrive within *3–5 business days*.`,
        ``,
        `Order details: ${ordersUrl}`,
        ``,
        SUPPORT_REPLY,
        `— ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl(), { template: 'payment_recovery' });
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

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl(), { template: 'coupon_expiry' });
}

export async function sendRestockAlertWhatsApp(
    phone: string,
    customerName: string,
    productName: string,
    productUrl: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const body = [
        `*Back in stock - ${BRAND}*`,
        ``,
        `Hi ${firstName}, *${productName}* is back in stock.`,
        ``,
        `Shop now: ${productUrl}`,
        ``,
        `- ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl(), {
        template: 'restock_alert',
        product_name: productName,
    });
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

export async function sendReturnApprovedWhatsApp(
    phone: string,
    customerName: string,
    orderNumber: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const returnsUrl = `${getSiteUrl()}/account/orders`;

    const body = [
        `*Return Approved - ${BRAND}*`,
        ``,
        `Hi ${firstName}, your return request for order *#${orderNumber}* has been approved.`,
        ``,
        `We will share pickup details soon. Please keep the item unused with tags and packaging ready.`,
        ``,
        `Track your return: ${returnsUrl}`,
        ``,
        SUPPORT_REPLY,
        `- ${BRAND} Team`,
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

export async function sendCouponExpiryNudgeWhatsApp(
    phone: string,
    customerName: string,
    couponCode: string,
    expiresAt: string
) {
    const firstName = customerName.split(' ')[0] || 'there';
    const shopUrl = `${getSiteUrl()}/shop`;
    const expiryDate = new Date(expiresAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
    });

    const body = [
        `*Your Root & Loom offer ends soon*`,
        ``,
        `Hi ${firstName}, coupon *${couponCode}* expires on *${expiryDate}*.`,
        ``,
        `Use it before the window closes.`,
        ``,
        `Shop now: ${shopUrl}`,
        ``,
        `- ${BRAND} Team`,
    ].join('\n');

    return sendWhatsAppMessage(phone, body, getBrandLogoUrl());
}
