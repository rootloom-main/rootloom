import { getSearchAnalytics, getSynonyms, getRedirects, getSearchConfig } from '@/lib/actions/admin-search';
import SearchManagementClient from './search-management-client';

export const dynamic = 'force-dynamic';

export default async function SearchManagementPage() {
    // Fetch all required data on the server
    const analytics = await getSearchAnalytics();
    const synonyms = await getSynonyms();
    const redirects = await getRedirects();
    const config = await getSearchConfig();

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-1 border-b border-stone-200 pb-5">
                <h1 className="text-3xl font-serif font-bold text-[#0a0f1a]">Search Engine Control Panel</h1>
                <p className="text-sm text-slate-500">Configure synonyms, query redirects, monitor real-time search analytics, and track checkout conversions.</p>
            </div>

            {/* Client Components for interactivity */}
            <SearchManagementClient 
                initialAnalytics={analytics}
                initialSynonyms={synonyms}
                initialRedirects={redirects}
                initialConfig={config}
            />
        </div>
    );
}
