import { createSSRClient } from '@/lib/utils/auth';
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
import { Edit, Eye } from 'lucide-react';
import Link from 'next/link';

export default async function PagesListing() {
    const supabase = await createSSRClient();

    const { data: pages } = await supabase
        .from('pages')
        .select('*')
        .order('title', { ascending: true }) as { data: any[] | null };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Content Pages</h1>
                <Link href="/admin/pages/new"><Button className="bg-deep-forest hover:bg-deep-forest/90">New Page</Button></Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Legal & Policy Pages</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pages?.map((page) => (
                                <TableRow key={page.id}>
                                    <TableCell className="font-medium">{page.title}</TableCell>
                                    <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs ${page.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {page.is_published ? 'Published' : 'Draft'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/${page.slug}`} target="_blank">
                                                <Button variant="ghost" size="icon">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Link href={`/admin/pages/${page.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
