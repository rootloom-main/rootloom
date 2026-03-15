'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
    Mail, 
    MessageSquare, 
    Clock, 
    Search, 
    Filter, 
    MoreVertical, 
    ExternalLink, 
    User, 
    CheckCircle2, 
    Trash2,
    Calendar,
    Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Submission {
    id: string;
    name: string;
    email: string;
    order_id: string | null;
    message: string;
    status: 'unread' | 'read' | 'replied' | 'archived';
    created_at: string;
}

export default function AdminMessagesPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const supabase = createClient();

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('contact_submissions')
                .select('*')
                .order('created_at', { ascending: false });

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;

            if (error) throw error;
            setSubmissions(data || []);
        } catch (error: any) {
            toast.error('Failed to load messages: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [filterStatus]);

    const updateStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase
                .from('contact_submissions')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            
            setSubmissions(prev => 
                prev.map(s => s.id === id ? { ...s, status: status as any } : s)
            );
            toast.success(`Marked as ${status}`);
        } catch (error: any) {
            toast.error('Update failed: ' + error.message);
        }
    };

    const deleteSubmission = async (id: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const { error } = await supabase
                .from('contact_submissions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            setSubmissions(prev => prev.filter(s => s.id !== id));
            toast.success('Message deleted');
        } catch (error: any) {
            toast.error('Delete failed: ' + error.message);
        }
    };

    const filteredSubmissions = submissions.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.order_id && s.order_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'unread': return <Badge variant="secondary" className="bg-rose-500/10 text-rose-500 border-rose-500/20">Unread</Badge>;
            case 'read': return <Badge variant="secondary" className="bg-sky-500/10 text-sky-500 border-sky-500/20">Read</Badge>;
            case 'replied': return <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">Replied</Badge>;
            case 'archived': return <Badge variant="secondary" className="bg-stone-500/10 text-stone-500 border-stone-500/20">Archived</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-8 space-y-8 bg-[#fcfcfc] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-black text-deep-forest uppercase tracking-tighter">Concierge Inbox</h1>
                    <p className="text-stone-500 text-sm mt-1">Manage and respond to customer inquiries from the contact concierge.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={fetchSubmissions} variant="outline" className="h-10 rounded-xl border-stone-200">
                        <Clock className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <Card className="border-stone-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="border-b border-stone-100 bg-stone-50/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <Input 
                                placeholder="Search messages, names, or order IDs..." 
                                className="pl-10 h-11 bg-white border-stone-200 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <Filter className="w-4 h-4 text-stone-400 md:hidden" />
                            <select 
                                className="h-11 px-4 bg-white border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-deep-forest transition-all"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="unread">Unread</option>
                                <option value="read">Read</option>
                                <option value="replied">Replied</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 items-center">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/4" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredSubmissions.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
                                <MessageSquare className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-stone-800">No messages found</h3>
                                <p className="text-stone-500">When customers reach out, their messages will appear here.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {filteredSubmissions.map((s) => (
                                <div key={s.id} className={`p-6 hover:bg-stone-50/80 transition-all group ${s.status === 'unread' ? 'bg-deep-forest/[0.02]' : ''}`}>
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500 shrink-0 font-bold group-hover:bg-deep-forest group-hover:text-white transition-colors">
                                                {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-base font-bold text-stone-900 ${s.status === 'unread' ? 'font-black' : ''}`}>{s.name}</span>
                                                    {getStatusBadge(s.status)}
                                                    {s.order_id && (
                                                        <Badge variant="outline" className="text-[10px] font-mono border-stone-200 text-stone-500">
                                                            #{s.order_id}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-stone-400 font-medium">
                                                    <span className="flex items-center gap-1.5 hover:text-deep-forest transition-colors cursor-pointer">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        {s.email}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {format(new Date(s.created_at), 'MMM dd, yyyy • hh:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-stone-600 mt-3 leading-relaxed max-w-4xl whitespace-pre-wrap">
                                                    {s.message}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-stone-200">
                                                    <MoreVertical className="w-5 h-5 text-stone-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-stone-200 shadow-xl">
                                                <DropdownMenuLabel className="text-[10px] text-stone-400 uppercase tracking-widest font-bold px-3 py-2">Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => updateStatus(s.id, 'read')} className="px-3 py-2.5 rounded-lg">
                                                    <CheckCircle2 className="w-4 h-4 mr-2 text-stone-500" />
                                                    Mark as Read
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatus(s.id, 'replied')} className="px-3 py-2.5 rounded-lg">
                                                    <Mail className="w-4 h-4 mr-2 text-stone-500" />
                                                    Mark as Replied
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatus(s.id, 'archived')} className="px-3 py-2.5 rounded-lg">
                                                    <Archive className="w-4 h-4 mr-2 text-stone-500" />
                                                    Archive
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-stone-100" />
                                                <DropdownMenuItem 
                                                    onClick={() => deleteSubmission(s.id)} 
                                                    className="px-3 py-2.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Message
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
