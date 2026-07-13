import { test, expect } from '@playwright/test';

test.describe('API Cache Headers', () => {
  test('keeps public search API cacheable', async ({ request }) => {
    const response = await request.get('/api/search?q=tee');

    expect(response.headers()['cache-control']).toContain('public');
    expect(response.headers()['cache-control']).toContain('s-maxage=300');
  });
});
