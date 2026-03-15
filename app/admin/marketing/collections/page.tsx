'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Eye, 
    EyeOff, 
    Layers,
    Calendar,
    Search
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { toggleCollectionStatusAction, deleteCollectionAction } from './collection-actions';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function CollectionsPage() {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchCollections = async () => {
        const { data, error } = await (supabase.from('collections') as any)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to fetch collections');
        } else {
            setCollections(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const toggleActive = async (id: string, current: boolean) => {
        const res = await toggleCollectionStatusAction(id, !current);

        if (!res.success) {
            toast.error(res.error || 'Update failed');
        } else {
            toast.success(`Collection ${!current ? 'activated' : 'deactivated'}`);
            fetchCollections();
        }
    };

    const deleteCollection = async (id: string) => {
        if (!confirm('Are you sure? This will delete the collection and all its product mappings.')) return;

        const res = await deleteCollectionAction(id);

        if (!res.success) {
            toast.error(res.error || 'Delete failed');
        } else {
            setCollections(collections.filter(c => c.id !== id));
            toast.success('Collection deleted');
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Collections & Campaigns</h1>
                    <p className="text-gray-500 mt-1">Create curated product lists for sales, ads, and promotions.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/marketing/collections/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Collection
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-400">Loading collections...</div>
                ) : collections.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Layers className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 text-lg">No collections found.</p>
                            <p className="text-sm text-gray-400 mb-6">Launch your first marketing campaign today.</p>
                            <Button asChild variant="outline">
                                <Link href="/admin/marketing/collections/new">
                                    <Plus className="mr-2 h-4 w-4" /> Create Collection
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    collections.map((collection) => (
                        <Card key={collection.id} className={cn(
                            "group overflow-hidden transition-all hover:shadow-xl",
                            !collection.is_active && "opacity-75 grayscale-[0.5]"
                        )}>
                            <div className="relative h-40 bg-slate-100">
                                {collection.image_url ? (
                                    <Image 
                                        src={collection.image_url} 
                                        alt={collection.name} 
                                        fill 
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-300">
                                        <Layers className="h-10 w-10" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <span className={cn(
                                        "px-2 py-1 text-[10px] font-bold rounded-full shadow-sm",
                                        collection.is_active ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                                    )}>
                                        {collection.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                            </div>
                            <CardContent className="p-5">
                                <h3 className="font-bold text-lg text-gray-900 mb-1">{collection.name}</h3>
                                <p className="text-xs text-blue-600 font-mono mb-3">/collections/{collection.slug}</p>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{collection.start_date ? new Date(collection.start_date).toLocaleDateString() : 'No Start'}</span>
                                    </div>
                                    <span>-</span>
                                    <div className="flex items-center gap-1">
                                        <span>{collection.end_date ? new Date(collection.end_date).toLocaleDateString() : 'No End'}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/collections/${collection.slug}`} target="_blank">
                                                <Search className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/marketing/collections/${collection.id}/edit`}>
                                                <Edit2 className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => toggleActive(collection.id, collection.is_active)}
                                        >
                                            {collection.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => deleteCollection(collection.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
