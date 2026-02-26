'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function SEOSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [keywords, setKeywords] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!user) return;
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('store_settings')
                .select('*')
                .in('key', ['seo_title', 'seo_description', 'seo_keywords']);

            if (data) {
                const settings = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
                setTitle(settings['seo_title'] || '');
                setDescription(settings['seo_description'] || '');
                setKeywords(settings['seo_keywords'] || '');
            }
        };
        fetchSettings();
    }, [user, supabase]);

    if (authLoading) return <div className="p-8">Loading...</div>;
    if (!user) {
        router.push('/auth/login');
        return null;
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const updates = [
            { key: 'seo_title', value: title },
            { key: 'seo_description', value: description },
            { key: 'seo_keywords', value: keywords },
        ];

        const { error } = await supabase
            .from('store_settings')
            .upsert(updates);

        if (error) {
            toast.error('Failed to save settings');
            console.error(error);
        } else {
            toast.success('SEO settings saved successfully');
        }
        setLoading(false);
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">SEO Settings</h1>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Global SEO Configuration</CardTitle>
                    <CardDescription>Default meta tags for the storefront.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Site Title</Label>
                            <Input
                                id="title"
                                placeholder="Root & Loom - Handicrafts"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Meta Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Discover the finest indian handicrafts..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="keywords">Keywords</Label>
                            <Input
                                id="keywords"
                                placeholder="handicrafts, india, decor, handmade"
                                value={keywords}
                                onChange={(e) => setKeywords(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
