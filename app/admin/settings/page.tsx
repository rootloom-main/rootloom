import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { StoreSettingsForm } from '@/components/admin/settings/store-settings-form';

export default async function AdminSettingsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/auth/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
        redirect('/');
    }

    const isDev = process.env.NODE_ENV === 'development';

    return (
        <div className="container mx-auto px-6 py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
                <p className="text-gray-500">View and manage your store configuration.</p>
            </div>

            <div className="grid gap-6">

                {/* Store Settings Form (Includes Profile, Tax, Maintenance) */}
                <StoreSettingsForm />

                {/* System Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                        <CardDescription>Current environment and configuration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="space-y-1">
                                <p className="font-medium">Environment</p>
                                <p className="text-sm text-gray-500">Current running mode of the application.</p>
                            </div>
                            <Badge variant={isDev ? "outline" : "default"} className={isDev ? "border-yellow-500 text-yellow-600" : "bg-green-600"}>
                                {isDev ? 'Development' : 'Production'}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="space-y-1">
                                <p className="font-medium">Database Connection</p>
                                <p className="text-sm text-gray-500">Supabase instance status.</p>
                            </div>
                            <Badge variant="outline" className="border-green-500 text-green-600">
                                Connected
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                            <div className="space-y-1">
                                <p className="font-medium">Version</p>
                                <p className="text-sm text-gray-500">Current application version.</p>
                            </div>
                            <span className="font-mono text-sm">v1.1.0</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Your Profile Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Information</CardTitle>
                        <CardDescription>Details about your admin account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input disabled value={profile.full_name || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input disabled value={profile.email} />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <div className="flex">
                                    <Badge variant="secondary" className="capitalize">
                                        {profile.role}
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>User ID</Label>
                                <Input disabled value={profile.id} className="font-mono text-xs" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
