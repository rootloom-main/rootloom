'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/components/providers/cart-provider';
import { captureEvent } from '@/lib/analytics/capture';

export function SuccessAnalytics({
    recoveredVia,
    retryCount,
}: {
    recoveredVia?: string;
    retryCount?: string;
}) {
    const { refreshCart } = useCart();
    const hasSyncedCart = useRef(false);

    useEffect(() => {
        if (hasSyncedCart.current) {
            return;
        }
        hasSyncedCart.current = true;
        sessionStorage.removeItem('rootloom_buy_now_item');
        refreshCart({ broadcast: true }).catch((error) => {
            console.error('Failed to refresh cart after checkout success:', error);
        });
    }, [refreshCart]);

    useEffect(() => {
        if (!recoveredVia) {
            return;
        }

        const payload = {
            recovered_via: recoveredVia,
            retry_count: Number(retryCount || '0') || 0,
        };

        if (recoveredVia === 'retry') {
            captureEvent('checkout_recovered_after_retry', payload);
        }

        if (recoveredVia === 'browser_switch') {
            captureEvent('checkout_recovered_after_browser_switch', payload);
        }
    }, [recoveredVia, retryCount]);

    return null;
}
