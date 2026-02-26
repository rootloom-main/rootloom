/**
 * Enterprise Phase 5: Multi-Currency & Internationalization Engine
 * 
 * System of truth: All base_price values in Supabase are stored in INR.
 * This module dynamically converts display prices based on the user's locale.
 */

export type SupportedCurrency = 'INR' | 'USD' | 'GBP' | 'AED' | 'EUR';

export interface CurrencyConfig {
    code: SupportedCurrency;
    symbol: string;
    name: string;
    exchangeRate: number; // Rate relative to 1 INR
    locale: string;
}

// Exchange rates relative to 1 INR (update periodically or fetch from API)
export const CURRENCY_MAP: Record<SupportedCurrency, CurrencyConfig> = {
    INR: {
        code: 'INR',
        symbol: '₹',
        name: 'Indian Rupee',
        exchangeRate: 1,
        locale: 'en-IN',
    },
    USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        exchangeRate: 0.012, // 1 INR ≈ 0.012 USD
        locale: 'en-US',
    },
    GBP: {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        exchangeRate: 0.0095, // 1 INR ≈ 0.0095 GBP
        locale: 'en-GB',
    },
    AED: {
        code: 'AED',
        symbol: 'د.إ',
        name: 'UAE Dirham',
        exchangeRate: 0.044, // 1 INR ≈ 0.044 AED
        locale: 'en-AE',
    },
    EUR: {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        exchangeRate: 0.011, // 1 INR ≈ 0.011 EUR
        locale: 'de-DE',
    },
};

/**
 * Convert a price from INR to the target currency
 */
export function convertPrice(priceInINR: number, currency: SupportedCurrency): number {
    const config = CURRENCY_MAP[currency];
    if (!config) return priceInINR;
    return Math.round(priceInINR * config.exchangeRate * 100) / 100;
}

/**
 * Format a price for display in the target currency
 */
export function formatCurrencyPrice(priceInINR: number, currency: SupportedCurrency = 'INR'): string {
    const config = CURRENCY_MAP[currency];
    if (!config) {
        return `₹${priceInINR.toLocaleString('en-IN')}`;
    }

    const convertedPrice = convertPrice(priceInINR, currency);

    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.code,
        minimumFractionDigits: currency === 'INR' ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(convertedPrice);
}

/**
 * Detect preferred currency from Accept-Language header or geo-IP
 */
export function detectCurrencyFromLocale(acceptLanguage?: string): SupportedCurrency {
    if (!acceptLanguage) return 'INR';

    const lang = acceptLanguage.toLowerCase();
    if (lang.includes('en-us')) return 'USD';
    if (lang.includes('en-gb')) return 'GBP';
    if (lang.includes('ar') || lang.includes('en-ae')) return 'AED';
    if (lang.includes('de') || lang.includes('fr') || lang.includes('es') || lang.includes('it')) return 'EUR';

    return 'INR'; // Default
}

/**
 * Get all supported currencies for a currency selector UI
 */
export function getSupportedCurrencies(): CurrencyConfig[] {
    return Object.values(CURRENCY_MAP);
}
