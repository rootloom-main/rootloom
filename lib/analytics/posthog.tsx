// lib/analytics/posthog.ts
'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Wrap this in a checker to avoid initializing in dev unless desired,
// but for setup we'll initialize if keys are present.
if (typeof window !== 'undefined') {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (posthogKey) {
        posthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: 'identified_only',
            // Enable debug mode in development
            debug: process.env.NODE_ENV === 'development',
        });
    } else {
        console.warn('PostHog key is missing. Analytics will not be tracked.');
    }
}

export function PHProvider({ children }: { children: React.ReactNode }) {
    // If no key is provided, just render children without the provider to prevent errors
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        return <>{children}</>;
    }
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
