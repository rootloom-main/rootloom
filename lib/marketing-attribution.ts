import { cookies } from 'next/headers';

const MARKETING_COOKIE = 'rootloom_attribution';

export type MarketingAttribution = {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    landing_path?: string;
    captured_at?: string;
};

export async function getMarketingAttribution(): Promise<MarketingAttribution | null> {
    try {
        const value = (await cookies()).get(MARKETING_COOKIE)?.value;
        if (!value) {
            return null;
        }

        return JSON.parse(value);
    } catch {
        return null;
    }
}
