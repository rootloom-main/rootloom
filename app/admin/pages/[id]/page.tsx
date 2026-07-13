'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function PageEditor() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [content, setContent] = useState('');
    const [isPublished, setIsPublished] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchPage = async () => {
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setTitle(data.title);
                setSlug(data.slug);
                setContent(data.content || '');
                setIsPublished(data.is_published);
            }
            setLoading(false);
        };
        fetchPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setSaving(true);

        const { error } = await supabase
            .from('pages')
            .update({
                title,
                content, // In a real app, use a Rich Text Editor (e.g., TipTap)
                is_published: isPublished,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            toast.error('Failed to save page');
        } else {
            toast.success('Page saved successfully');
            router.refresh();
        }
        setSaving(false);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Edit Page: {title}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                </div>
            </div>

            <div className="grid gap-6 max-w-4xl">
                <div className="grid gap-2">
                    <Label>Page Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="grid gap-2">
                    <Label>URL Slug</Label>
                    <Input value={slug} disabled className="bg-gray-100" />
                </div>

                <div className="grid gap-2">
                    <Label>Content (HTML Supported)</Label>
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[400px] font-mono"
                    />
                    <p className="text-xs text-gray-500">
                        Supports basic HTML (e.g., &lt;h1&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;).
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                    <Label htmlFor="published">Published (Visible to public)</Label>
                </div>
            </div>
        </div>
    );
}
