import { test, expect } from '@playwright/test';

test.describe('Admin Route Security', () => {
    // List of admin routes to check
    const adminRoutes = [
        '/admin',
        '/admin/orders',
        '/admin/products',
        '/admin/customers',
        '/admin/settings'
    ];

    for (const route of adminRoutes) {
        test(`should redirect unauthenticated user from ${route} to login`, async ({ page }) => {
            await page.goto(route);
            // specific logic might vary based on your app's redirect behavior, 
            // but usually it goes to /auth/login
            await expect(page).toHaveURL(/.*\/auth\/login/);
        });
    }
});
