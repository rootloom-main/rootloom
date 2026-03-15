/**
 * Pricing Utilities for Root & Loom
 * Ensures consistency across Shop, Cart, and Checkout
 */

interface MinimalProduct {
    base_price: number;
    product_variants?: Array<{
        price_adjustment: number;
        stock: number;
    }>;
}

interface MinimalVariant {
    price_adjustment: number;
    stock: number;
}

/**
 * Calculates the final price for a product based on a specific variant or the first available one.
 */
export function getProductPrice(product: MinimalProduct, variant?: MinimalVariant | null): number {
    if (!product) return 0;
    
    const base = Number(product.base_price) || 0;

    // If a specific variant is provided, use it
    if (variant) {
        return base + (Number(variant.price_adjustment) || 0);
    }

    // Fallback: Use the first available variant's price
    if (product.product_variants && product.product_variants.length > 0) {
        // Try to find first in-stock variant
        const firstAvailable = product.product_variants.find(v => (v.stock || 0) > 0) || product.product_variants[0];
        return base + (Number(firstAvailable?.price_adjustment) || 0);
    }

    return base;
}

/**
 * Standard Multiplier for MRP (Luxury Brand standard: 1.25x)
 */
export function calculateMRP(price: number): number {
    return Math.round(price * 1.25);
}

/**
 * Calculate Discount Percentage
 */
export function calculateDiscountPercentage(price: number, mrp: number): number {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
}
