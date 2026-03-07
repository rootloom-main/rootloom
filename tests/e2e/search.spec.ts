import { test, expect } from '@playwright/test';

test.describe('Search and Category Flows', () => {

    test('Can search for a product', async ({ page }) => {
        await page.goto('/');

        // Find the search button in the header and click it
        const searchButton = page.locator('header').getByRole('button', { name: /search/i }).first();
        // If the site uses an icon-only button without an aria-label, this might need adjustment:
        if (await searchButton.isVisible()) {
            await searchButton.click();
        } else {
            // Fallback locator for the search icon
            await page.locator('header .lucide-search').first().click();
        }

        // Type in the search dialog
        const searchInput = page.getByPlaceholder(/search/i);
        await searchInput.fill('Silk');

        // Press enter
        await searchInput.press('Enter');

        // Wait for URL to update
        await page.waitForURL('**/search?q=Silk**');

        // Verify results page is shown
        await expect(page.getByRole('heading', { name: /Search Results/i })).toBeVisible();
    });
});
