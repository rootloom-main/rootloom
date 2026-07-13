'use client';

import { useEffect } from 'react';

const LEGACY_CACHE_PREFIXES = [
  'workbox-',
  'next-static-',
  'static-js-',
  'static-style-',
  'pages',
  'apis',
  'start-url',
];

export function ServiceWorkerCleanup() {
  useEffect(() => {
    const removeLegacyWorker = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter((registration) => registration.scope === `${window.location.origin}/`)
            .map((registration) => registration.unregister())
        );
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => LEGACY_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
            .map((name) => caches.delete(name))
        );
      }
    };

    void removeLegacyWorker().catch(() => {
      // Cache cleanup is best-effort and must never interrupt app hydration.
    });
  }, []);

  return null;
}
