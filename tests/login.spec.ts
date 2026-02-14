import { test, expect } from '@playwright/test';

test('login page loads and has correct elements', async ({ page }) => {
    await page.goto('/auth/login');

    // Check title
    await expect(page).toHaveTitle(/Login/i);

    // Default is Phone Login or Email - checking for one
    const phoneInput = page.getByLabel(/Mobile Number/i);
    const emailInput = page.getByLabel(/email/i);

    if (await phoneInput.isVisible()) {
        // Switch to Email Login
        await page.click('button:has-text("Continue with Email")');
    }

    // Now Check for email and password inputs
    await expect(emailInput).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
});

test('navigation to signup', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('text=Sign up'); // or similar link
    await expect(page.url()).toContain('/auth/signup');
});
