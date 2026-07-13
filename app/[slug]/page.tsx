import { createSSRClient as createClient } from '@/lib/utils/auth';
import { notFound } from 'next/navigation';
import { sanitizeHtml } from '@/lib/utils/sanitize-html';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: page } = await supabase
        .from('pages')
        .select('title')
        .eq('slug', slug)
        .eq('is_published', true)
        .single() as { data: { title: string } | null };

    if (!page) return { title: 'Page Not Found' };
    return { title: page.title };
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createClient();
    const { data: page } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single() as { data: any | null };

    if (!page) {
        notFound();
    }

    const safeContent = sanitizeHtml(page.content || '');

    return (
        <div className="container mx-auto px-6 py-12 max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-8">{page.title}</h1>
            <div
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: safeContent }}
            />
        </div>
    );
}

// Optional: specific styling for prose can be added via @tailwindcss/typography plugin
