'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * ScrollLockFixer is a silent utility component that ensures the body's scroll
 * state is reset on every route or search parameter change.
 *
 * This prevents "zombie" scroll locks caused by Radix UI (Sheets/Dialogs) that
 * failed to clean up their `overflow: hidden` styles during a client-side navigation.
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
        document.body.removeAttribute('data-scroll-locked');

        // 3. Force clean the html element too just in case
        document.documentElement.style.overflow = '';

    }, [pathname, searchParams]);

    return null; // This component doesn't render anything
}
