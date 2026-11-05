import { createSSRClient } from '@/lib/utils/auth';
import { getCurrentUser } from '@/lib/utils/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { BannerActions } from '@/components/admin/banner-actions';

interface Banner {
    id: string;
    title: string;
    image_url: string;
    link: string | null;
    position: string;
    active: boolean;
    display_order: number;
    created_at: string;
    collections?: { id: string; name: string; slug: string } | null;
}

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
    const supabase = await createSSRClient();

    let banners: Banner[] = [];
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*, collections(id, name, slug)')
            .order('display_order', { ascending: false })
            .order('created_at', { ascending: false });

        if (!error && data) {
            banners = data as unknown as Banner[];
        }
    } catch (e) {
        console.error('Error fetching banners:', e);
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Banners</h1>
                <Link href="/admin/marketing/banners/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Banner
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Banners</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Image</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Linked Destination</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Order</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {banners.map((banner) => (
                                <TableRow key={banner.id}>
                                    <TableCell>
                                        <div className="relative h-12 w-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                            {banner.image_url ? (
                                                <Image
                                                    src={banner.image_url}
                                                    alt={banner.title}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">
                                                    No image
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{banner.title}</TableCell>
                                    <TableCell>
                                        {banner.collections?.name ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                {banner.collections.name}
                                            </span>
                                        ) : banner.link ? (
                                            <span className="text-xs text-muted-foreground font-mono">{banner.link}</span>
                                        ) : (
                                            <span className="text-xs text-stone-400 italic">Default (/shop)</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="capitalize">{banner.position}</TableCell>
                                    <TableCell>{(banner as any).display_order || 0}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs ${banner.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {banner.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <BannerActions bannerId={banner.id} active={banner.active} />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {banners.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No banners found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
