'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Edit, Trash2, CheckCircle2 } from 'lucide-react';
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
    }

    return (
        <Card className={cn("relative", address.is_default && "border-primary bg-primary/5")}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base font-medium">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {address.full_name}
                    </div>
                    {address.is_default && <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Default</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground space-y-1 mb-4">
                    <p>{address.phone}</p>
                    <p>{address.address_line1}</p>
                    <p>{address.address_line2}</p>
                    <p>
                        {address.city}, {address.state} {address.postal_code}
                    </p>
                    <p>{address.country}</p>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t mt-2">
                    {!address.is_default && (
                        <Button variant="ghost" size="sm" onClick={handleSetDefault} disabled={isPending}>
                            Set Default
                        </Button>
                    )}
                    <Link href={`/account/addresses/${address.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Edit className="h-3 w-3" /> Edit
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
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
