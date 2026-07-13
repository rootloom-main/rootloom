export const RETURN_WINDOW_DAYS = 7;
export const REFUND_SETTLEMENT_WINDOW = '5-7 business days';

export function getReturnDeadline(deliveredAt: string | Date) {
    const deliveryDate = new Date(deliveredAt);
    return new Date(deliveryDate.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function isReturnEligible(deliveredAt?: string | Date | null, now = new Date()) {
    if (!deliveredAt) {
        return false;
    }

    return now <= getReturnDeadline(deliveredAt);
}

export function getReturnPolicySummary() {
    return `Eligible items can be returned or exchanged within ${RETURN_WINDOW_DAYS} days of delivery with photo evidence. Refunds are processed back to the original source when possible and typically settle within ${REFUND_SETTLEMENT_WINDOW}.`;
}
