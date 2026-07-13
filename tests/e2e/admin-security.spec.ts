import { test, expect } from '@playwright/test';

test.describe('Admin Route Security', () => {
  const adminRoutes = [
    '/admin',
    '/admin/orders',
    '/admin/products',
    '/admin/customers',
    '/admin/settings',
  ];

  for (const route of adminRoutes) {
    test(`redirects unauthenticated users away from ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/.*\/auth\/login/);
    });
  }
});
