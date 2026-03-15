'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { 
    Send, 
    Trash2, 
    MessageSquare, 
    Users, 
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { sendCampaignAction, deleteCampaignAction } from '@/app/admin/marketing/campaigns/campaign-actions';
import { toast } from 'sonner';

interface Campaign {
    id: string;
    name: string;
    status: 'draft' | 'scheduled' | 'processing' | 'completed' | 'failed';
    audience_type: string;
    message_body: string;
    recipient_count: number;
    sent_count: number;
    created_at: string;
    scheduled_at?: string;
    completed_at?: string;
}

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleSend = async (id: string) => {
        if (!confirm('Are you sure you want to send this campaign?')) return;
        setLoading(id);
        try {
            const res = await sendCampaignAction(id);
            if (res.success) {
                toast.success('Campaign scheduled for sending');
            } else {
                toast.error(res.error || 'Failed to send');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        setLoading(id);
        try {
            const res = await deleteCampaignAction(id);
            if (res.success) {
                toast.success('Campaign deleted');
            } else {
                toast.error(res.error || 'Failed to delete');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"><CheckCircle2 className="h-3 w-3" /> Sent</span>;
            case 'processing':
                return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"><Loader2 className="h-3 w-3 animate-spin" /> Processing</span>;
            case 'scheduled':
                return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-trace-700 ring-1 ring-inset ring-indigo-600/20"><Clock className="h-3 w-3" /> Scheduled</span>;
            case 'failed':
                return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20"><AlertCircle className="h-3 w-3" /> Failed</span>;
            default:
                return <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Draft</span>;
        }
    };

    return (
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Campaign</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Audience</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Performance</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {campaigns.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">{c.message_body}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    {c.audience_type === 'all' ? 'All Customers' : c.audience_type === 'buyers' ? 'Only Buyers' : 'Abandoned Cart'}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {getStatusBadge(c.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-medium">{c.sent_count} / {c.recipient_count}</div>
                                <div className="text-xs text-gray-500">Delivered</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Calendar className="h-4 w-4" />
                                    {format(new Date(c.created_at), 'MMM dd, yyyy')}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                    {c.status === 'draft' && (
                                        <button
                                            onClick={() => handleSend(c.id)}
                                            disabled={loading === c.id}
                                            className="inline-flex items-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                            title="Send Now"
                                        >
                                            {loading === c.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        disabled={loading === c.id}
                                        className="inline-flex items-center p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {campaigns.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No campaigns found. Start by creating your first broadcast!</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
