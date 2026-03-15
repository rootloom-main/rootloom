'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Plus, 
    GripVertical, 
    Edit2, 
    Trash2, 
    Eye, 
    EyeOff, 
    Layout,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function HomeSectionsPage() {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const fetchSections = async () => {
        const { data, error } = await supabase
            .from('home_sections')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            toast.error('Failed to fetch sections');
        } else {
            setSections(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSections();
    }, []);

    const toggleActive = async (id: string, current: boolean) => {
        const { error } = await supabase
            .from('home_sections')
            .update({ active: !current })
            .eq('id', id);

        if (error) {
            toast.error('Update failed');
        } else {
            fetchSections();
        }
    };

    const deleteSection = async (id: string) => {
        if (!confirm('Are you sure? This will remove the section from homepage.')) return;

        const { error } = await supabase
            .from('home_sections')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Delete failed');
        } else {
            setSections(sections.filter(s => s.id !== id));
            toast.success('Section removed');
        }
    };

    const moveOrder = async (index: number, direction: 'up' | 'down') => {
        const newSections = [...sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (targetIndex < 0 || targetIndex >= sections.length) return;

        // Swap display_order if they exist, or just use index
        const item1 = newSections[index];
        const item2 = newSections[targetIndex];

        const { error } = await supabase.rpc('swap_home_sections_order', {
            id1: item1.id,
            id2: item2.id
        });

        if (error) {
             // Fallback: manual update if RPC fails
             const tempOrder = item1.display_order;
             await supabase.from('home_sections').update({ display_order: item2.display_order }).eq('id', item1.id);
             await supabase.from('home_sections').update({ display_order: tempOrder }).eq('id', item2.id);
        }
        
        fetchSections();
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Home Builder</h1>
                    <p className="text-gray-500 mt-1">Manage sections and layout of your homepage.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/marketing/sections/new">
                        <Plus className="mr-2 h-4 w-4" /> Add Section
                    </Link>
                </Button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">Loading layout...</div>
                ) : sections.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Layout className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">No sections found. Start by adding one!</p>
                        </CardContent>
                    </Card>
                ) : (
                    sections.map((section, index) => (
                        <div 
                            key={section.id}
                            className={cn(
                                "group flex items-center gap-4 p-4 bg-white border rounded-xl transition-all hover:shadow-md",
                                !section.active && "opacity-60 bg-gray-50"
                            )}
                        >
                            <div className="flex flex-col gap-1">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => moveOrder(index, 'up')}
                                    disabled={index === 0}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => moveOrder(index, 'down')}
                                    disabled={index === sections.length - 1}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="p-2 bg-slate-100 rounded-lg">
                                <Layout className="h-5 w-5 text-slate-600" />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900">{section.title || section.type}</h3>
                                    <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase text-slate-500">
                                        {section.type}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {section.config?.collection ? `Collection: ${section.config.collection}` : 'Standard Section'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => toggleActive(section.id, section.active)}
                                    title={section.active ? "Hide from Homepage" : "Show on Homepage"}
                                >
                                    {section.active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                                </Button>
                                <Button variant="ghost" size="icon" asChild>
                                    <Link href={`/admin/marketing/sections/${section.id}/edit`}>
                                        <Edit2 className="h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => deleteSection(section.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
