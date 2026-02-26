import { test, expect } from '@playwright/test';

test('checkout flow', async ({ page }) => {
    // 0. Login first (required for cart)
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com'); // Use a test account
    await page.fill('input[type="password"]', 'password123'); // Needs a real test account or mock
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/'); // Wait for redirect to home

    // 1. Go to Shop
    await page.goto('/shop');

    // Wait for products to load
    // We look for a link that goes to a product page
    const productLink = page.locator('a[href^="/product/"]').first();
    await expect(productLink).toBeVisible({ timeout: 10000 });
    await productLink.click();

    // 2. Product Details Page
    // Wait for title
    await expect(page.locator('h1')).toBeVisible();

    // Handle Size Selection
    // We look for inputs that start with "size-" and are NOT disabled
    const enabledSizeInputs = page.locator('input[id^="size-"]:not([disabled])');
    const sizeCount = await enabledSizeInputs.count();
    if (sizeCount > 0) {
        const firstId = await enabledSizeInputs.first().getAttribute('id');
        // Click the label associated with the input
        if (firstId) await page.click(`label[for="${firstId}"]`);
    }

    // Handle Color Selection
    const enabledColorInputs = page.locator('input[id^="color-"]:not([disabled])');
    const colorCount = await enabledColorInputs.count();
    if (colorCount > 0) {
        const firstId = await enabledColorInputs.first().getAttribute('id');
        if (firstId) await page.click(`label[for="${firstId}"]`);
    }

    // 3. Add to Cart
    // Check for the button. It might be "Out of Stock" or "Add to Cart"
    const addToCartBtn = page.getByRole('button').filter({ hasText: /Add to Cart|Out of Stock/ }).first();
    await expect(addToCartBtn).toBeVisible();

    const btnText = await addToCartBtn.innerText();
    if (btnText.includes('Out of Stock')) {
        test.skip(true, 'Product is out of stock, skipping cart test');
        return;
    }

    await expect(addToCartBtn).toBeEnabled();
    await addToCartBtn.click();

    // Wait for any toast or visual confirmation if possible, or just wait a bit
    // The button text changes to "Adding..." then back to "Add to Cart"
    await expect(addToCartBtn).toHaveText('Adding...', { timeout: 2000 }); // strict mode might fail if it's too fast
    await expect(addToCartBtn).toHaveText('Add to Cart', { timeout: 10000 });

    // 4. Go to Cart
    await page.goto('/cart');

    // 5. Verify Cart
    await expect(page.getByText('Shopping Cart')).toBeVisible();
    // Check if we have items. "Order Summary" should be visible
    await expect(page.getByText('Order Summary')).toBeVisible();

    // 6. Proceed to Checkout
    const checkoutBtn = page.getByRole('button', { name: /Proceed to Checkout/i });
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // 7. Verify Checkout Page
    await expect(page).toHaveURL(/.*checkout/);
});
