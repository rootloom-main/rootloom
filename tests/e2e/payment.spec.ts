import { test, expect } from '@playwright/test';

test.describe('Checkout and Payment Surfaces', () => {
  test('redirects unauthenticated checkout access to login with next param', async ({ page }) => {
    await page.goto('/checkout');

    await expect(page).toHaveURL(/\/auth\/login\?next=(%2Fcheckout|\/checkout)/);
  });

  test('redirects success page access without a verified order reference', async ({ page }) => {
    await page.goto('/checkout/success');

    await expect(page).toHaveURL(/\/(account\/orders|auth\/login)/);
  });

  test('renders the success page with order details from the query string', async ({ page }) => {
    await page.goto('/checkout/success?orderNumber=ORD-TEST-123');

    await expect(page.getByText('ORD-TEST-123')).toBeVisible();
    await expect(page.getByRole('button', { name: /review or edit orders/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue shopping/i })).toBeVisible();
  });

  test('does not claim no charge was made while payment verification is uncertain', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.setItem('rootloom_failed_order_id', 'order_test_uncertain');
    });
    await page.goto('/checkout/failed?reason=network_error');

    await expect(page.getByRole('heading', { name: /verifying your payment/i })).toBeVisible();
    await expect(page.getByText(/no charges were made/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /checking/i })).toBeVisible();
  });
});
