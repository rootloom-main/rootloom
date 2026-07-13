import { test, expect } from '@playwright/test';

test.describe('Cron route security', () => {
  test('does not execute cron routes for public requests', async ({ request }) => {
    const response = await request.get('/api/cron/release-payment-reservations');

    expect([401, 403, 500]).toContain(response.status());
    expect(response.headers()['cache-control']).toContain('no-store');
  });
});
