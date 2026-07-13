'use client';

type AnalyticsProperties = Record<string, unknown>;

let posthogPromise: Promise<typeof import('posthog-js').default | null> | null = null;

async function getPostHog() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || typeof window === 'undefined') {
    return null;
  }

  if (!posthogPromise) {
    posthogPromise = import('posthog-js').then(({ default: posthog }) => {
      if (!posthog.__loaded) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          person_profiles: 'identified_only',
          debug: process.env.NODE_ENV === 'development',
        });
      }
      return posthog;
    }).catch(() => null);
  }

  return posthogPromise;
}

export function captureEvent(event: string, properties?: AnalyticsProperties) {
  void getPostHog().then((posthog) => {
    posthog?.capture(event, properties);
  });
}
