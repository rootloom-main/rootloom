import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('shows the OTP login UI', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { name: /Continue Secure Checkout/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your email address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible();
  });

  test('redirects unauthenticated account access to login', async ({ page }) => {
    await page.goto('/account');

    await expect(page).toHaveURL(/\/auth\/login\?next=%2Faccount/);
  });
});
