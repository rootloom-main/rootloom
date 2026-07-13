'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/auth';
import { revalidatePath } from 'next/cache';

// Helper middleware to check permission
async function verifyAdmin() {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
        throw new Error('Unauthorized access to search admin controls.');
    }
}

/**
 * Fetch Search Engine Analytics
 */
export async function getSearchAnalytics() {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;

    try {
        // 1. Top Searches
        const { data: topSearches, error: topError } = await supabase
            .rpc('get_top_searches', { limit_count: 10 });
        
        // 2. No Result Searches
        const { data: noResultSearches, error: noError } = await supabase
            .rpc('get_no_result_searches', { limit_count: 10 });

        // 3. Top Clicked & Purchased Products
        const { data: clickedProducts, error: clickError } = await supabase
            .rpc('get_top_clicked_products', { limit_count: 10 });

        // 4. Summaries
        const { data: summaries, error: totalError } = await supabase
            .rpc('get_search_analytics_summary');

        if (topError || noError || clickError || totalError) {
            console.error("Analytics fetch errors:", { topError, noError, clickError, totalError });
        }

        const summaryRow = summaries?.[0] || {};
        const totalSearches = Number(summaryRow.total_searches || 0);
        const totalNoResults = Number(summaryRow.total_no_results || 0);
        const totalClicks = Number(summaryRow.total_clicks || 0);
        const totalPurchases = Number(summaryRow.total_purchases || 0);

        return {
            topSearches: topSearches || [],
            noResultSearches: noResultSearches || [],
            clickedProducts: clickedProducts || [],
            summary: {
                uniqueQueries: Number(summaryRow.unique_queries || 0),
                totalSearches,
                noResultsCount: totalNoResults,
                noResultsRate: totalSearches ? Math.round((totalNoResults / totalSearches) * 100) : 0,
                totalClicks,
                totalPurchases,
                conversionRate: totalClicks ? Math.round((totalPurchases / totalClicks) * 100) : 0
            }
        };
    } catch (err) {
        console.error('Error fetching search analytics:', err);
        return {
            topSearches: [],
            noResultSearches: [],
            clickedProducts: [],
            summary: { uniqueQueries: 0, totalSearches: 0, noResultsCount: 0, noResultsRate: 0, totalClicks: 0, totalPurchases: 0, conversionRate: 0 }
        };
    }
}

/**
 * Synonym Management
 */
export async function getSynonyms() {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;
    const { data, error } = await supabase
        .from('search_synonyms')
        .select('*')
        .order('source_term');
    if (error) throw error;
    return data || [];
}

export async function saveSynonym(id: string | null, sourceTerm: string, synonymsList: string[]) {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;

    const cleanSource = sourceTerm.trim().toLowerCase();
    const cleanSyns = synonymsList.map((s: string) => s.trim().toLowerCase()).filter((s: string) => s !== '' && s !== cleanSource);

    if (id) {
        const { error } = await supabase
            .from('search_synonyms')
            .update({
                source_term: cleanSource,
                synonyms: cleanSyns,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('search_synonyms')
            .insert({
                source_term: cleanSource,
                synonyms: cleanSyns
            });
        if (error) throw error;
    }

    revalidatePath('/admin/search-management');
    return { success: true };
}

export async function deleteSynonym(id: string) {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;
    const { error } = await supabase
        .from('search_synonyms')
        .delete()
        .eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/search-management');
    return { success: true };
}

/**
 * Redirects Management
 */
export async function getRedirects() {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;
    const { data, error } = await supabase
        .from('search_redirects')
        .select('*')
        .order('query_text');
    if (error) throw error;
    return data || [];
}

export async function saveRedirect(id: string | null, queryText: string, redirectUrl: string, isActive: boolean = true) {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;

    const cleanQuery = queryText.trim().toLowerCase();
    const cleanUrl = redirectUrl.trim();

    if (id) {
        const { error } = await supabase
            .from('search_redirects')
            .update({
                query_text: cleanQuery,
                redirect_url: cleanUrl,
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('search_redirects')
            .insert({
                query_text: cleanQuery,
                redirect_url: cleanUrl,
                is_active: isActive
            });
        if (error) throw error;
    }

    revalidatePath('/admin/search-management');
    return { success: true };
}

export async function deleteRedirect(id: string) {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;
    const { error } = await supabase
        .from('search_redirects')
        .delete()
        .eq('id', id);
    if (error) throw error;

    revalidatePath('/admin/search-management');
    return { success: true };
}

/**
 * Search Configuration Management
 */
export async function getSearchConfig() {
    const supabase = (await createAdminClient()) as any;
    const { data, error } = await supabase
        .from('search_configs')
        .select('*');
    
    if (error) {
        console.error('Error fetching search configs:', error);
        return {};
    }

    const configs: any = {};
    data?.forEach((row: any) => {
        configs[row.key] = row.value;
    });
    return configs;
}

export async function saveSearchConfig(key: string, value: any) {
    await verifyAdmin();
    const supabase = (await createAdminClient()) as any;

    const { error } = await supabase
        .from('search_configs')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        });
    if (error) throw error;

    revalidatePath('/admin/search-management');
    return { success: true };
}
