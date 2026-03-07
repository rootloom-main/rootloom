import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {

    test('Shows login page correctly', async ({ page }) => {
        await page.goto('/auth/login');
        await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
        await expect(page.getByPlaceholder(/email/i)).toBeVisible();
        await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    });

    test('Shows signup page correctly', async ({ page }) => {
        await page.goto('/auth/signup');
        await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
        await expect(page.getByPlaceholder(/full name/i)).toBeVisible();
        await expect(page.getByPlaceholder(/email/i)).toBeVisible();
        await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    });

    test('Validates empty form submission', async ({ page }) => {
        await page.goto('/auth/login');
        await page.getByRole('button', { name: /sign in/i }).click();
        // Assuming the browser uses native HTML5 required validation
        await expect(page.getByPlaceholder(/email/i)).toBeFocused();
    });

    // Note: We avoid testing full real signup because we don't want to spam the DB
    // Real E2E auth tests should use a dedicated test user configured in Supabase.
});
