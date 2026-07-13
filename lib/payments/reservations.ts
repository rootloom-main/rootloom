import { SupabaseClient } from '@supabase/supabase-js';

type ReservationCartItem = {
    id?: string;
    variant_id: string;
    quantity: number;
};

type PaymentLike = {
    id?: string;
    amount?: number;
    currency?: string;
    status: string;
    cart_snapshot: ReservationCartItem[];
    metadata?: Record<string, any> | null;
};

export const PAYMENT_RESERVATION_TTL_MINUTES = 15;

function getReservationItems(items: ReservationCartItem[]) {
    return items.map((item) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
    }));
}

export function buildReservationMetadata(metadata: Record<string, any> = {}) {
    const reservedAt = new Date().toISOString();
    const reservationExpiresAt = new Date(
        Date.now() + PAYMENT_RESERVATION_TTL_MINUTES * 60 * 1000
    ).toISOString();

    return {
        ...metadata,
        reservation_status: 'active',
        reserved_at: reservedAt,
        reservation_expires_at: reservationExpiresAt,
    };
}

export async function reservePaymentInventory(
    supabase: SupabaseClient,
    items: ReservationCartItem[]
) {
    const reservationItems = getReservationItems(items);
    if (reservationItems.length === 0) {
        return;
    }

    const { error } = await supabase.rpc('reserve_stock_batch', {
        items: reservationItems,
    } as any);

    if (error) {
        throw error;
    }
}

export async function releasePaymentInventory(
    supabase: SupabaseClient,
    payment: PaymentLike,
    reason: 'payment_failed' | 'reservation_expired' | 'create_order_failed'
) {
    if (!payment.id || !payment.cart_snapshot?.length) {
        return false;
    }

    const { data, error } = await supabase.rpc('release_payment_reservation', {
        p_payment_id: payment.id,
        p_reason: reason,
    } as any);

    if (error) {
        throw error;
    }

    return Boolean((data as any)?.released);
}

export async function ensureActivePaymentReservation(
    supabase: SupabaseClient,
    payment: PaymentLike
) {
    if (!payment.id) {
        throw new Error('Payment id is required to recover reservation safely');
    }

    const { data, error } = await supabase.rpc('recover_payment_reservation', {
        p_payment_id: payment.id,
        p_ttl_minutes: PAYMENT_RESERVATION_TTL_MINUTES,
    } as any);

    if (error) {
        throw error;
    }

    return {
        recovered: ['recovered', 'extended'].includes((data as any)?.status),
        status: (data as any)?.status,
    };
}

function normalizeReservationItems(items: ReservationCartItem[] = []) {
    return items
        .map((item) => ({
            variant_id: item.variant_id,
            quantity: Number(item.quantity || 0),
        }))
        .sort((a, b) => `${a.variant_id}:${a.quantity}`.localeCompare(`${b.variant_id}:${b.quantity}`));
}

export function doesPaymentMatchReservationItems(
    payment: Pick<PaymentLike, 'cart_snapshot'>,
    items: ReservationCartItem[]
) {
    const left = JSON.stringify(normalizeReservationItems(payment.cart_snapshot || []));
    const right = JSON.stringify(normalizeReservationItems(items || []));
    return left === right;
}

export function hasActiveReservation(payment: Pick<PaymentLike, 'metadata'>) {
    const metadata = (payment.metadata || {}) as Record<string, any>;
    const reservationStatus = metadata.reservation_status;
    const expiresAt = metadata.reservation_expires_at
        ? new Date(metadata.reservation_expires_at).getTime()
        : null;

    return (
        ['active', 'recovered'].includes(reservationStatus) &&
        expiresAt !== null &&
        Number.isFinite(expiresAt) &&
        expiresAt > Date.now()
    );
}
