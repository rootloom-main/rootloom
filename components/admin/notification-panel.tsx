'use client';

import { useState, useEffect } from 'react';
import { Bell, Package, AlertTriangle, RefreshCcw, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

interface Notification {
    id: string;
    type: 'stock' | 'order' | 'return';
    title: string;
    message: string;
    timestamp: string;
    link: string;
}

export function NotificationPanel() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/admin/notifications');
            const data = await res.json();
            setNotifications(data.notifications || []);
            setCount(data.count || 0);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 2 minutes
        const interval = setInterval(fetchNotifications, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'stock': return <AlertTriangle className="h-4 w-4 text-rose-500" />;
            case 'order': return <Package className="h-4 w-4 text-blue-500" />;
            case 'return': return <RefreshCcw className="h-4 w-4 text-purple-500" />;
            default: return <Bell className="h-4 w-4 text-stone-500" />;
        }
    };

    const getBg = (type: string) => {
        switch (type) {
            case 'stock': return 'bg-rose-50';
            case 'order': return 'bg-blue-50';
            case 'return': return 'bg-purple-50';
            default: return 'bg-stone-50';
        }
    };

    const formatTime = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="relative group cursor-pointer">
                    <Button variant="ghost" size="icon" className="group-hover:text-deep-forest group-hover:bg-stone-50 transition-all rounded-xl">
                        <Bell className="h-5 w-5 text-stone-500 group-hover:text-deep-forest" />
                    </Button>
                    {count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-rose-500 border-2 border-white rounded-full text-[10px] font-bold animate-in zoom-in duration-300">
                            {count}
                        </Badge>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-stone-200 shadow-2xl rounded-2xl overflow-hidden mr-4" align="end">
                <div className="p-4 bg-white border-b border-stone-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-deep-forest">Notifications</h3>
                        <p className="text-[10px] text-stone-400 font-medium font-mono uppercase tracking-widest">
                            {count} New Updates
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold text-stone-400 hover:text-deep-forest uppercase tracking-widest" onClick={() => setCount(0)}>
                        Clear All
                    </Button>
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                    {loading ? (
                        <div className="p-10 text-center flex flex-col items-center gap-2">
                            <div className="w-4 h-4 border-2 border-stone-200 border-t-deep-forest rounded-full animate-spin" />
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Hydrating Dashboard...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center gap-3">
                            <div className="p-3 bg-stone-50 rounded-full">
                                <Check className="w-6 h-6 text-stone-300" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-deep-forest">All Clear!</p>
                                <p className="text-[10px] text-stone-400 font-medium">No new alerts found.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-50">
                            {notifications.map((n) => (
                                <Link
                                    key={n.id}
                                    href={n.link}
                                    className="block p-4 hover:bg-stone-50 transition-colors"
                                    onClick={() => setOpen(false)}
                                >
                                    <div className="flex gap-3">
                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-white", getBg(n.type))}>
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="space-y-1 overflow-hidden">
                                            <div className="flex justify-between items-center gap-2">
                                                <p className="text-[11px] font-bold text-deep-forest truncate">{n.title}</p>
                                                <span className="text-[9px] text-stone-400 font-bold uppercase shrink-0">{formatTime(n.timestamp)}</span>
                                            </div>
                                            <p className="text-[10px] text-stone-500 leading-relaxed line-clamp-2">{n.message}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <Separator className="bg-stone-100" />
                <div className="p-2 bg-stone-50/50">
                    <Button variant="link" className="w-full text-[10px] font-bold text-stone-400 hover:text-deep-forest uppercase tracking-widest h-8" asChild>
                        <Link href="/admin/analytics">View Analytics Pipeline <ArrowRight className="w-3 h-3 ml-1" /></Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
