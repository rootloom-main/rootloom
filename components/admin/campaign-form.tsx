'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Users, 
    MessageSquare, 
    Info, 
    ArrowLeft, 
    AtSign, 
    Link as LinkIcon,
    Loader2,
    MonitorIcon,
    Smartphone
} from 'lucide-react';
import Link from 'next/link';
import { getAudienceCount, createCampaignAction } from '@/app/admin/marketing/campaigns/campaign-actions';
import { toast } from 'sonner';

export function CampaignForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [audienceCount, setAudienceCount] = useState<number | null>(null);
    const [counting, setCounting] = useState(false);
    
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        audienceType: 'all',
        messageBody: 'Hello {{name}} 👋\n\nOur Diwali Sale is LIVE! 🔥\nFlat 40% OFF on all handcrafted items.\n\nShop now 👉 {{store_url}}/shop'
    });
    
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchCount = async () => {
            setCounting(true);
            try {
                const count = await getAudienceCount(formData.audienceType);
                setAudienceCount(count);
            } catch (err) {
                console.error(err);
            } finally {
                setCounting(false);
            }
        };
        fetchCount();
    }, [formData.audienceType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createCampaignAction(formData);
            if (res.success) {
                toast.success('Campaign created successfully!');
                router.push('/admin/marketing/campaigns');
                router.refresh();
            } else {
                toast.error(res.error || 'Failed to create campaign');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const injectVariable = (variable: string) => {
        setFormData(prev => ({
            ...prev,
            messageBody: prev.messageBody + ` {{${variable}}}`
        }));
    };

    // Message Preview Logic
    const previewMessage = formData.messageBody
        .replace(/{{name}}/g, 'Sneha')
        .replace(/{{store_url}}/g, 'rootloom.com');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Form Side */}
            <div className="space-y-8">
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Campaign Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Diwali Festive Sale 2026"
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Select Audience</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {['all', 'buyers', 'abandoned_cart'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, audienceType: type })}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                        formData.audienceType === type 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                        : 'border-gray-50 bg-gray-50 text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    <Users className="h-5 w-5 mb-2" />
                                    <span className="text-xs font-bold capitalize">{type.replace('_', ' ')}</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                            <Info className="h-4 w-4" />
                            {counting ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>Reaches <strong>{audienceCount || 0}</strong> verified phone numbers.</span>}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-900">Message Content</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => injectVariable('name')}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md text-gray-600 transition-colors"
                                >
                                    + Add Name
                                </button>
                                <button
                                    type="button"
                                    onClick={() => injectVariable('store_url')}
                                    className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md text-gray-600 transition-colors"
                                >
                                    + Add Link
                                </button>
                            </div>
                        </div>
                        <textarea
                            required
                            rows={6}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm leading-relaxed"
                            value={formData.messageBody}
                            onChange={(e) => setFormData({ ...formData, messageBody: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Campaign Draft'}
                    </button>
                </form>
            </div>

            {/* Preview Side */}
            <div className="relative">
                <div className="sticky top-8 space-y-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Smartphone className="h-4 w-4" /> Preview (Client View)
                    </h3>
                    
                    <div className="max-w-[320px] mx-auto bg-[#e5ddd5] rounded-[2.5rem] border-[8px] border-gray-900 overflow-hidden shadow-2xl aspect-[9/18]">
                        <div className="bg-[#075e54] text-white p-4 flex items-center gap-3">
                            <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold font-display">RL</span>
                            </div>
                            <div>
                                <div className="text-xs font-bold leading-none">Root & Loom</div>
                                <div className="text-[10px] opacity-70">Online</div>
                            </div>
                        </div>
                        
                        <div className="p-4 space-y-4 h-full relative">
                            {/* WhatsApp Message Bubble */}
                            <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm relative animate-in fade-in slide-in-from-left duration-500">
                                <div className="absolute -left-2 top-0 border-t-8 border-t-white border-l-8 border-l-transparent" />
                                <div className="text-xs whitespace-pre-wrap text-gray-800 leading-relaxed">
                                    {previewMessage}
                                </div>
                                <div className="text-[9px] text-gray-400 text-right mt-1">
                                    {mounted ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="absolute inset-x-0 bottom-0 bg-[#f0f2f5] p-3 flex items-center gap-2">
                            <div className="flex-1 bg-white rounded-full h-8 px-4 flex items-center text-[10px] text-gray-400">Type a message...</div>
                            <div className="h-8 w-8 bg-[#075e54] rounded-full flex items-center justify-center text-white">
                                <AtSign className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                        <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <strong>Note:</strong> Messages sent outside the 24-hour window require Twilio-approved templates. Please ensure your message body matches an approved template in your Twilio Console to avoid delivery issues.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
