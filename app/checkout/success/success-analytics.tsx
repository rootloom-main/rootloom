'use client';

import { useEffect, useRef } from 'react';
import { useCart } from '@/components/providers/cart-provider';
import { captureEvent } from '@/lib/analytics/capture';

export function SuccessAnalytics({
    recoveredVia,
    retryCount,
    productIds = []
}: {
    recoveredVia?: string;
    retryCount?: string;
    productIds?: string[];
}) {
    const { refreshCart } = useCart();
    const hasSyncedCart = useRef(false);
    const hasLoggedConversions = useRef(false);

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

    // Track search-to-purchase conversions
    useEffect(() => {
        if (hasLoggedConversions.current || !productIds || productIds.length === 0) {
            return;
        }
        hasLoggedConversions.current = true;

        const lastQuery = localStorage.getItem('lastSearchQuery');
        if (!lastQuery) return;

        // Post purchase conversions for each product
        Promise.all(
            productIds.map(productId =>
                fetch('/api/search/click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: lastQuery,
                        productId,
                        isPurchase: true
                    })
                })
            )
        ).then(() => {
            // Clean up query after logging conversion
            localStorage.removeItem('lastSearchQuery');
        }).catch(err => {
            console.error('Failed to log search purchases:', err);
        });
    }, [productIds]);

    return null;
}
