import twilio from 'twilio';

/**
 * Ensures the phone number is in E.164 format and suitable for WhatsApp.
 * Assumes Indian (+91) if no country code is present and length is 10.
 */
export function formatWhatsAppNumber(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digit characters except '+'
    let cleaned = phone.replace(/[^\d+]/g, '');

    if (!cleaned.startsWith('+')) {
        // Remove leading '0' if user typed it
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }

        // Handle Indian numbers (10 digits)
        if (cleaned.length === 10) {
            cleaned = `+91${cleaned}`;
        } else if (cleaned.length > 10 && !cleaned.startsWith('+')) {
             // Fallback for numbers that might already have a country code but no '+'
             cleaned = `+${cleaned}`;
        }
    }

    return `whatsapp:${cleaned}`;
}

/**
 * Sends a WhatsApp message using Twilio.
 */
export async function sendWhatsAppMessage(to: string | null | undefined, body: string): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhoneNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
        console.warn('WhatsApp utility: Missing Twilio credentials. Skipping message.');
        return false;
    }

    if (!to) {
        console.warn('WhatsApp utility: No recipient phone number provided.');
        return false;
    }

    const formattedTo = formatWhatsAppNumber(to);
    if (!formattedTo) {
        console.warn(`WhatsApp utility: Could not format phone number: ${to}`);
        return false;
    }

    try {
        const client = twilio(accountSid, authToken);
        const result = await client.messages.create({
            body,
            from: fromPhoneNumber,
            to: formattedTo
        });

        console.log(`WhatsApp message sent successfully to ${formattedTo}. SID: ${result.sid}`);
        return true;
    } catch (error: any) {
        console.error(`WhatsApp utility: Failed to send message to ${formattedTo}:`, error.message);
        return false;
    }
}

/**
 * Helper to send order confirmation
 */
export async function sendOrderConfirmationWhatsApp(phone: string, customerName: string, orderNumber: string, total: string, isCOD: boolean = false) {
    const firstName = customerName.split(' ')[0] || 'there';
    const paymentMethod = isCOD ? 'Cash on Delivery' : 'Prepaid';
    const body = `Hi ${firstName}, your Root & Loom order #${orderNumber} for ₹${total} has been confirmed!\n\n*Payment Method:* ${paymentMethod}\n\nYou can track your order live on the Rootloom dashboard.`;
    
    return sendWhatsAppMessage(phone, body);
}

/**
 * Abandoned checkout recovery
 */
export async function sendPaymentRecoveryNotification(phone: string, customerName: string, cartTotal: string) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const retryUrl = `${siteUrl}/cart`;
    const firstName = customerName.split(' ')[0] || 'there';

    const body = `*Root & Loom Concierge*\n\nHello ${firstName},\n\nWe noticed some items left in your reserved bag (Total: ₹${cartTotal}).\n\nDon't worry, we're holding your selections for a limited time.\n\nYou can complete your purchase here: ${retryUrl}\n\nNeed help? Just reply to this message.`;

    return sendWhatsAppMessage(phone, body);
}
