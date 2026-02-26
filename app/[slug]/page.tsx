import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { slug: string } }) {
    const supabase = await createClient();
    const { data: page } = await supabase
        .from('pages')
        .select('title')
        .eq('slug', params.slug)
        .eq('is_published', true)
        .single() as { data: { title: string } | null };

    if (!page) return { title: 'Page Not Found' };
    return { title: page.title };
}

export default async function DynamicPage({ params }: { params: { slug: string } }) {
    const supabase = await createClient();
    const { data: page } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', params.slug)
        .eq('is_published', true)
        .single() as { data: any | null };

    if (!page) {
        notFound();
    }

    return (
        <div className="container mx-auto px-6 py-12 max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-8">{page.title}</h1>
            <div
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: page.content || '' }}
            />
        </div>
    );
}

// Optional: specific styling for prose can be added via @tailwindcss/typography plugin
