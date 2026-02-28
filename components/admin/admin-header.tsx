'use client';

import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NotificationPanel } from './notification-panel';

export function AdminHeader() {
    return (
        <header className="h-16 border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
            <div className="flex-1 max-w-md">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-deep-forest transition-colors" />
                    <Input
                        placeholder="Search for orders, products, or customers..."
                        className="pl-10 h-10 border-stone-100 bg-stone-50/50 rounded-xl focus-visible:ring-deep-forest focus-visible:bg-white transition-all overflow-hidden"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <NotificationPanel />

                <div className="h-8 w-[1px] bg-stone-100 mx-2" />

                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-deep-forest">Admin Hero</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Super Admin</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center border border-stone-200 shadow-sm overflow-hidden">
                        <User className="w-6 h-6 text-stone-400" />
                    </div>
                </div>
            </div>
        </header>
    );
}
