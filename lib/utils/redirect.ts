export function sanitizeRedirectPath(value: string | null | undefined, fallback = '/') {
  if (!value) {
    return fallback;
  }

  try {
    const base = 'https://rootloom.in';
    const url = new URL(value, base);

    if (url.origin !== base) {
      return fallback;
    }

    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
  } catch {
    return fallback;
  }
}
