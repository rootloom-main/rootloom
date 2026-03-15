'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SectionForm } from '../../_components/section-form';
import { Loader2 } from 'lucide-react';

export default function EditSectionPage() {
    const params = useParams();
    const router = useRouter();
    const [section, setSection] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchSection = async () => {
            const { data, error } = await supabase
                .from('home_sections')
                .select('*')
                .eq('id', params?.id)
                .single();

            if (error || !data) {
                router.push('/admin/marketing/sections');
                return;
            }
            setSection(data);
            setLoading(false);
        };
        fetchSection();
    }, [params?.id]);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Edit Section</h1>
            <div className="max-w-2xl">
                <SectionForm initialData={section} />
            </div>
        </div>
    );
}
