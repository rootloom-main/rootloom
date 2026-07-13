'use client';

import { useState, useTransition } from 'react';
import { 
    saveSynonym, 
    deleteSynonym, 
    saveRedirect, 
    deleteRedirect, 
    saveSearchConfig 
} from '@/lib/actions/admin-search';
import { 
    Search, 
    Shuffle, 
    ArrowRightLeft, 
    TrendingUp, 
    Trash2, 
    Plus, 
    Edit3,
    Check,
    Loader2,
    BarChart3,
    Percent,
    MousePointer,
    AlertTriangle,
    Eye,
    Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SearchManagementClientProps {
    initialAnalytics: any;
    initialSynonyms: any[];
    initialRedirects: any[];
    initialConfig: any;
}

export default function SearchManagementClient({
    initialAnalytics,
    initialSynonyms,
    initialRedirects,
    initialConfig
}: SearchManagementClientProps) {
    const [activeTab, setActiveTab] = useState<'analytics' | 'synonyms' | 'redirects' | 'config'>('analytics');
    const [isPending, startTransition] = useTransition();

    // Data states
    const [synonyms, setSynonyms] = useState(initialSynonyms);
    const [redirects, setRedirects] = useState(initialRedirects);
    const [config, setConfig] = useState(initialConfig);

    // Form states (Synonyms)
    const [synonymId, setSynonymId] = useState<string | null>(null);
    const [sourceTerm, setSourceTerm] = useState('');
    const [synsInput, setSynsInput] = useState('');
    const [isSynonymModalOpen, setIsSynonymModalOpen] = useState(false);

    // Form states (Redirects)
    const [redirectId, setRedirectId] = useState<string | null>(null);
    const [queryText, setQueryText] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false);

    // Form states (Config)
    const [trendingInput, setTrendingInput] = useState(config.trending_searches?.join(', ') || '');

    // Submit Synonym Group
    const handleSaveSynonym = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceTerm.trim() || !synsInput.trim()) {
            toast.error('Source term and synonyms list are required.');
            return;
        }

        const synList = synsInput.split(',').map((s: string) => s.trim()).filter(Boolean);

        startTransition(async () => {
            try {
                await saveSynonym(synonymId, sourceTerm, synList);
                toast.success('Synonym group saved successfully.');
                
                // Refresh local states
                // In a real app we'd trigger a router.refresh() but let's update states directly for instant feedback
                if (synonymId) {
                    setSynonyms((prev: any[]) => prev.map((s: any) => s.id === synonymId ? { ...s, source_term: sourceTerm.toLowerCase(), synonyms: synList.map((item: string) => item.toLowerCase()) } : s));
                } else {
                    setSynonyms((prev: any[]) => [...prev, { id: 'temp-' + Math.random(), source_term: sourceTerm.toLowerCase(), synonyms: synList.map((item: string) => item.toLowerCase()) }]);
                }

                // Reset form
                setSynonymId(null);
                setSourceTerm('');
                setSynsInput('');
                setIsSynonymModalOpen(false);
            } catch (err: any) {
                toast.error(err.message || 'Failed to save synonym group.');
            }
        });
    };

    // Delete Synonym Group
    const handleDeleteSynonym = async (id: string) => {
        if (!confirm('Are you sure you want to delete this synonym group?')) return;

        startTransition(async () => {
            try {
                await deleteSynonym(id);
                toast.success('Synonym group deleted.');
                setSynonyms((prev: any[]) => prev.filter((s: any) => s.id !== id));
            } catch (err: any) {
                toast.error(err.message || 'Failed to delete synonym group.');
            }
        });
    };

    // Edit Synonym Helper
    const handleEditSynonym = (syn: any) => {
        setSynonymId(syn.id);
        setSourceTerm(syn.source_term);
        setSynsInput(syn.synonyms.join(', '));
        setIsSynonymModalOpen(true);
    };

    // Submit Redirect rule
    const handleSaveRedirect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!queryText.trim() || !redirectUrl.trim()) {
            toast.error('Query keyword and redirect URL are required.');
            return;
        }

        startTransition(async () => {
            try {
                await saveRedirect(redirectId, queryText, redirectUrl, isActive);
                toast.success('Redirect rule saved.');
                
                if (redirectId) {
                    setRedirects((prev: any[]) => prev.map((r: any) => r.id === redirectId ? { ...r, query_text: queryText.toLowerCase(), redirect_url: redirectUrl, is_active: isActive } : r));
                } else {
                    setRedirects((prev: any[]) => [...prev, { id: 'temp-' + Math.random(), query_text: queryText.toLowerCase(), redirect_url: redirectUrl, is_active: isActive }]);
                }

                setRedirectId(null);
                setQueryText('');
                setRedirectUrl('');
                setIsActive(true);
                setIsRedirectModalOpen(false);
            } catch (err: any) {
                toast.error(err.message || 'Failed to save redirect.');
            }
        });
    };

    // Delete Redirect rule
    const handleDeleteRedirect = async (id: string) => {
        if (!confirm('Are you sure you want to delete this redirect rule?')) return;

        startTransition(async () => {
            try {
                await deleteRedirect(id);
                toast.success('Redirect rule deleted.');
                setRedirects((prev: any[]) => prev.filter((r: any) => r.id !== id));
            } catch (err: any) {
                toast.error(err.message || 'Failed to delete redirect.');
            }
        });
    };

    const handleEditRedirect = (red: any) => {
        setRedirectId(red.id);
        setQueryText(red.query_text);
        setRedirectUrl(red.redirect_url);
        setIsActive(red.is_active);
        setIsRedirectModalOpen(true);
    };

    // Save trending Searches Configuration
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        const trendingList = trendingInput.split(',').map((s: string) => s.trim()).filter(Boolean);

        startTransition(async () => {
            try {
                await saveSearchConfig('trending_searches', trendingList);
                toast.success('Trending searches configuration updated successfully.');
                setConfig((prev: any) => ({ ...prev, trending_searches: trendingList }));
            } catch (err: any) {
                toast.error(err.message || 'Failed to update search configurations.');
            }
        });
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Tabs Selector */}
            <div className="flex border-b border-stone-200 gap-6">
                {[
                    { id: 'analytics', label: 'Search Analytics', icon: BarChart3 },
                    { id: 'synonyms', label: 'Synonym Rules', icon: Shuffle },
                    { id: 'redirects', label: 'Search Redirects', icon: ArrowRightLeft },
                    { id: 'config', label: 'Trending Settings', icon: TrendingUp }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === tab.id 
                                ? 'border-[#0a0f1a] text-[#0a0f1a]' 
                                : 'border-transparent text-stone-400 hover:text-stone-700'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT: ANALYTICS */}
            {activeTab === 'analytics' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border border-stone-200">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Searches</p>
                                        <h3 className="text-2xl font-bold font-serif">{initialAnalytics.summary.totalSearches}</h3>
                                    </div>
                                    <div className="p-2 bg-stone-100 rounded-lg text-deep-forest">
                                        <Search className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 font-mono">{initialAnalytics.summary.uniqueQueries} Unique Keywords</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-stone-200">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Clicks</p>
                                        <h3 className="text-2xl font-bold font-serif">{initialAnalytics.summary.totalClicks}</h3>
                                    </div>
                                    <div className="p-2 bg-stone-100 rounded-lg text-deep-forest">
                                        <Eye className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-4 font-mono">From suggestions/results</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-stone-200">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">No-Result Searches</p>
                                        <h3 className="text-2xl font-bold font-serif text-amber-600">{initialAnalytics.summary.noResultsCount}</h3>
                                    </div>
                                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                        <AlertTriangle className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-amber-500 mt-4 font-bold">{initialAnalytics.summary.noResultsRate}% No-Result rate</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-stone-200">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Conversion Rate</p>
                                        <h3 className="text-2xl font-bold font-serif text-green-600">{initialAnalytics.summary.conversionRate}%</h3>
                                    </div>
                                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                        <Percent className="h-5 w-5" />
                                    </div>
                                </div>
                                <p className="text-[10px] text-green-600 mt-4 font-bold">{initialAnalytics.summary.totalPurchases} purchases logged</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Lists Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Queries */}
                        <Card className="border border-stone-200 shadow-sm">
                            <CardHeader className="bg-stone-50 border-b border-stone-100">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-stone-700">Top Searched Queries</CardTitle>
                                <CardDescription>Most frequently entered search terms by users.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-stone-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-stone-100">
                                                <th className="px-4 py-2">Query</th>
                                                <th className="px-4 py-2 text-center">Searches</th>
                                                <th className="px-4 py-2 text-center">Matches</th>
                                                <th className="px-4 py-2">Last Searched</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {initialAnalytics.topSearches.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="text-center py-8 text-stone-400">No search logs available</td>
                                                </tr>
                                            ) : (
                                                initialAnalytics.topSearches.map((row: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-semibold text-deep-forest">&quot;{row.query_text}&quot;</td>
                                                        <td className="px-4 py-3 text-center font-bold text-slate-600">{row.count}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Badge variant={row.results_count === 0 ? "destructive" : "secondary"}>
                                                                {row.results_count}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(row.last_searched).toLocaleDateString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* No Results Queries */}
                        <Card className="border border-stone-200 shadow-sm">
                            <CardHeader className="bg-stone-50 border-b border-stone-100">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-stone-700 text-amber-600">No-Result Queries</CardTitle>
                                <CardDescription>Searches that returned zero products. Useful for stocking decisions.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-stone-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-stone-100">
                                                <th className="px-4 py-2">Query</th>
                                                <th className="px-4 py-2 text-center">Count</th>
                                                <th className="px-4 py-2">Last Searched</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {initialAnalytics.noResultSearches.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="text-center py-8 text-stone-400">All search queries returned results!</td>
                                                </tr>
                                            ) : (
                                                initialAnalytics.noResultSearches.map((row: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-semibold text-amber-700">&quot;{row.query_text}&quot;</td>
                                                        <td className="px-4 py-3 text-center font-bold text-slate-600">{row.count}</td>
                                                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(row.last_searched).toLocaleDateString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Clicked & Purchased */}
                        <Card className="border border-stone-200 shadow-sm lg:col-span-2">
                            <CardHeader className="bg-stone-50 border-b border-stone-100">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-stone-700">Top Clicked Products & Conversions</CardTitle>
                                <CardDescription>Tracks click-through rates and actual conversions per query term.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="bg-stone-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-stone-100">
                                                <th className="px-4 py-2">Search Query</th>
                                                <th className="px-4 py-2">Target Product</th>
                                                <th className="px-4 py-2 text-center">Clicks</th>
                                                <th className="px-4 py-2 text-center">Purchases</th>
                                                <th className="px-4 py-2 text-center">Conversion</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {initialAnalytics.clickedProducts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-8 text-stone-400">No clicks or purchases tracked yet.</td>
                                                </tr>
                                            ) : (
                                                initialAnalytics.clickedProducts.map((row: any, idx: number) => {
                                                    const conv = row.click_count ? Math.round((row.purchase_count / row.click_count) * 100) : 0;
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-3 font-medium text-slate-600">&quot;{row.query_text}&quot;</td>
                                                            <td className="px-4 py-3 font-semibold text-deep-forest">{row.product_name}</td>
                                                            <td className="px-4 py-3 text-center font-bold">{row.click_count}</td>
                                                            <td className="px-4 py-3 text-center font-bold text-green-600">{row.purchase_count}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-full text-xs font-bold",
                                                                    conv >= 20 ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"
                                                                )}>
                                                                    {conv}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SYNONYMS */}
            {activeTab === 'synonyms' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-[#0a0f1a]">Search Synonyms Mappings</h2>
                            <p className="text-sm text-slate-500">Group keywords (e.g. tee, tshirt, t-shirt) so they return identical products.</p>
                        </div>
                        <Button 
                            onClick={() => {
                                setSynonymId(null);
                                setSourceTerm('');
                                setSynsInput('');
                                setIsSynonymModalOpen(true);
                            }}
                            className="bg-deep-forest text-white hover:bg-deep-forest/90 h-10 px-4 rounded"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add Synonym Group
                        </Button>
                    </div>

                    {/* Synonym Modal */}
                    {isSynonymModalOpen && (
                        <Card className="border border-stone-200 max-w-xl mx-auto shadow-lg">
                            <CardHeader className="bg-stone-50 border-b border-stone-100">
                                <CardTitle className="text-base font-bold font-serif">{synonymId ? 'Edit Synonym Group' : 'Create Synonym Group'}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSaveSynonym} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Primary Keyword (Source term)</label>
                                        <Input
                                            value={sourceTerm}
                                            onChange={e => setSourceTerm(e.target.value)}
                                            placeholder="e.g. tshirt"
                                            required
                                            className="h-10 border-stone-200 focus-visible:ring-1 focus-visible:ring-deep-forest/20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Synonyms (Comma-separated list)</label>
                                        <Input
                                            value={synsInput}
                                            onChange={e => setSynsInput(e.target.value)}
                                            placeholder="e.g. tee, t-shirt, top"
                                            required
                                            className="h-10 border-stone-200 focus-visible:ring-1 focus-visible:ring-deep-forest/20"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setIsSynonymModalOpen(false)}
                                            disabled={isPending}
                                            className="h-10 px-4"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                            className="bg-deep-forest text-white hover:bg-deep-forest/90 h-10 px-4"
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Group'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Synonyms List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {synonyms.length === 0 ? (
                            <div className="col-span-2 text-center py-12 border border-dashed rounded-lg border-stone-300 text-stone-400">
                                No synonym groupings defined. Click &quot;Add Synonym Group&quot; to configure.
                            </div>
                        ) : (
                            synonyms.map(syn => (
                                <Card key={syn.id} className="border border-stone-200 hover:shadow-md transition-all">
                                    <CardHeader className="py-4 px-5 border-b border-stone-50 flex flex-row justify-between items-center space-y-0">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-stone-900 text-white font-bold">{syn.source_term}</Badge>
                                            <span className="text-xs text-stone-400">Primary</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditSynonym(syn)}
                                                className="h-8 w-8 text-stone-500 hover:text-deep-forest hover:bg-stone-100"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteSynonym(syn.id)}
                                                className="h-8 w-8 text-stone-500 hover:text-red-500 hover:bg-red-50/50"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-4 px-5 flex flex-wrap gap-1.5">
                                        {syn.synonyms.map((s: string) => (
                                            <Badge key={s} variant="outline" className="border-stone-200 font-medium text-stone-600 bg-white">
                                                {s}
                                            </Badge>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: REDIRECTS */}
            {activeTab === 'redirects' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-[#0a0f1a]">Search Query Redirects</h2>
                            <p className="text-sm text-slate-500">Redirect users directly to pages (e.g. redirect &quot;refund&quot; to /account/returns).</p>
                        </div>
                        <Button 
                            onClick={() => {
                                setRedirectId(null);
                                setQueryText('');
                                setRedirectUrl('');
                                setIsActive(true);
                                setIsRedirectModalOpen(true);
                            }}
                            className="bg-deep-forest text-white hover:bg-deep-forest/90 h-10 px-4 rounded"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add Redirect Rule
                        </Button>
                    </div>

                    {/* Redirect Modal */}
                    {isRedirectModalOpen && (
                        <Card className="border border-stone-200 max-w-xl mx-auto shadow-lg">
                            <CardHeader className="bg-stone-50 border-b border-stone-100">
                                <CardTitle className="text-base font-bold font-serif">{redirectId ? 'Edit Redirect Rule' : 'Create Redirect Rule'}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form onSubmit={handleSaveRedirect} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Search Term / Keyword</label>
                                        <Input
                                            value={queryText}
                                            onChange={e => setQueryText(e.target.value)}
                                            placeholder="e.g. contact"
                                            required
                                            className="h-10 border-stone-200 focus-visible:ring-1 focus-visible:ring-deep-forest/20"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Redirect URL (internal or absolute)</label>
                                        <Input
                                            value={redirectUrl}
                                            onChange={e => setRedirectUrl(e.target.value)}
                                            placeholder="e.g. /contact or /collections/new-arrivals"
                                            required
                                            className="h-10 border-stone-200 focus-visible:ring-1 focus-visible:ring-deep-forest/20"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="is-active"
                                            checked={isActive}
                                            onChange={e => setIsActive(e.target.checked)}
                                            className="rounded border-stone-300 text-deep-forest focus:ring-deep-forest"
                                        />
                                        <label htmlFor="is-active" className="text-sm font-semibold text-stone-700">Enable this redirect rule</label>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setIsRedirectModalOpen(false)}
                                            disabled={isPending}
                                            className="h-10 px-4"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                            className="bg-deep-forest text-white hover:bg-deep-forest/90 h-10 px-4"
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Rule'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Redirects Table */}
                    <Card className="border border-stone-200 shadow-sm">
                        <CardContent className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-stone-50 text-[10px] uppercase font-bold tracking-widest text-slate-400 border-b border-stone-100">
                                        <th className="px-6 py-3">Keyword</th>
                                        <th className="px-6 py-3">Target URL</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {redirects.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="text-center py-12 text-stone-400">No redirect rules defined.</td>
                                        </tr>
                                    ) : (
                                        redirects.map(red => (
                                            <tr key={red.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-semibold text-deep-forest">&quot;{red.query_text}&quot;</td>
                                                <td className="px-6 py-4 font-mono text-slate-500">{red.redirect_url}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={red.is_active ? "default" : "secondary"} className={cn(red.is_active ? "bg-green-600 text-white hover:bg-green-600/90" : "bg-stone-100 text-stone-500")}>
                                                        {red.is_active ? 'Active' : 'Disabled'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditRedirect(red)}
                                                        className="h-8 w-8 text-stone-500 hover:text-deep-forest hover:bg-stone-100"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteRedirect(red.id)}
                                                        className="h-8 w-8 text-stone-500 hover:text-red-500 hover:bg-red-50/50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB CONTENT: CONFIG */}
            {activeTab === 'config' && (
                <div className="space-y-6 max-w-xl animate-in fade-in duration-300">
                    <div>
                        <h2 className="text-xl font-bold text-[#0a0f1a]">Trending & Popular Search Configurations</h2>
                        <p className="text-sm text-slate-500">Override automated trending terms displayed inside the search autocomplete modal.</p>
                    </div>

                    <Card className="border border-stone-200 shadow-sm">
                        <CardContent className="pt-6">
                            <form onSubmit={handleSaveConfig} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Trending Queries Override (Comma-separated)</label>
                                    <textarea
                                        value={trendingInput}
                                        onChange={e => setTrendingInput(e.target.value)}
                                        placeholder="e.g. linen shirts, cotton kurtas, summer dresses, footwear"
                                        rows={4}
                                        className="w-full min-h-[80px] p-3 text-sm border border-stone-200 rounded-sm focus-visible:outline-none focus:ring-1 focus:ring-deep-forest/20 font-sans"
                                    />
                                    <p className="text-[10px] text-slate-400 leading-normal">Enter words separated by commas in priority order. These will override the defaults in suggestion dropdowns.</p>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        disabled={isPending}
                                        className="bg-deep-forest text-white hover:bg-deep-forest/90 h-10 px-6 font-bold"
                                    >
                                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
