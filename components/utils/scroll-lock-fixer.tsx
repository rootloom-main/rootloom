'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * ScrollLockFixer is a silent utility component that ensures the body's scroll 
 * state is reset on every route or search parameter change.
 * 
 * This prevents "zombie" scroll locks caused by Radix UI (Sheets/Dialogs) or 
 * Razorpay Modals that failed to clean up their `overflow: hidden` styles 
 * during a client-side navigation.
 */
export function ScrollLockFixer() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // 1. Reset overflow style
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
        document.body.style.paddingRight = '';

        // 2. Remove Radix-specific scroll lock attributes (data-scroll-locked)
        // Radix UI sometimes uses this attribute to prevent scrolling.
        document.body.removeAttribute('data-scroll-locked');

        // 3. Force clean the html element too just in case
        document.documentElement.style.overflow = '';

        // 4. Specifically target lingering Razorpay containers if any
        const razorpayContainer = document.querySelector('.razorpay-container');
        if (razorpayContainer) {
            razorpayContainer.remove();
        }

    }, [pathname, searchParams]);

    return null; // This component doesn't render anything
}
