'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { deleteAddress, setDefaultAddress } from '@/lib/actions/address';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AddressCardProps {
    address: any;
}

export function AddressCard({ address }: AddressCardProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this address?')) {
            startTransition(async () => {
                const result = await deleteAddress(address.id);
                if (result.success) {
                    toast.success(result.message);
                    router.refresh();
                } else {
                    toast.error(result.message);
                }
            });
        }
    };

    const handleSetDefault = () => {
        startTransition(async () => {
            const result = await setDefaultAddress(address.id);
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const getAddressEmoji = (type: string = 'Home') => {
        switch (type?.toLowerCase()) {
            case 'work': return '💼';
            case 'other': return '📍';
            default: return '🏠';
        }
    };

    return (
        <Card className={cn("relative rounded-2xl shadow-sm border-stone-200 overflow-hidden bg-white hover:shadow-md transition-all duration-300", address.is_default && "border-deep-forest bg-stone-50/20")}>
            <CardHeader className="pb-3 bg-stone-50/50 border-b border-stone-100 py-4 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-serif text-deep-forest font-bold">
                    <span className="text-lg">{getAddressEmoji(address.type)}</span>
                    <span>{address.type || 'Home'}</span>
                </CardTitle>
                {address.is_default && (
                    <Badge className="bg-deep-forest text-white gap-1 text-[9px] uppercase tracking-wider font-bold h-5 px-2">
                        Default
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
                <div className="text-xs text-stone-600 space-y-1 font-medium leading-relaxed">
                    <p className="font-bold text-sm text-stone-900 mb-1">{address.full_name}</p>
                    <p>Phone: <span className="font-bold text-stone-900">{address.phone}</span></p>
                    <p>{address.address_line1}</p>
                    {address.address_line2 && <p className="text-stone-400 italic">{address.address_line2}</p>}
                    <p>
                        {address.city}, {address.state} - <span className="font-bold text-stone-900">{address.postal_code}</span>
                    </p>
                    <p className="text-stone-400 uppercase tracking-widest text-[9px] mt-2 font-bold">{address.country}</p>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-stone-100 mt-2 text-xs">
                    {!address.is_default && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleSetDefault} 
                            disabled={isPending}
                            className="h-8 text-stone-500 hover:text-deep-forest font-bold uppercase tracking-wider text-[10px]"
                        >
                            Set Default
                        </Button>
                    )}
                    <Link href={`/account/addresses/${address.id}`}>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1.5 h-8 border-stone-200 text-stone-600 hover:text-deep-forest font-bold uppercase tracking-wider text-[10px] rounded-lg"
                        >
                            <Edit className="h-3 w-3" /> Edit
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50/50 gap-1.5 h-8 font-bold uppercase tracking-wider text-[10px] rounded-lg"
                        onClick={handleDelete}
                        disabled={isPending}
                    >
                        <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
