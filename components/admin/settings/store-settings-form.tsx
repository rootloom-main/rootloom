'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function StoreSettingsForm() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [storeName, setStoreName] = useState('Root & Loom');
    const [supportEmail, setSupportEmail] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [taxRate, setTaxRate] = useState('0');
    const [gstin, setGstin] = useState('');
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase
                .from('store_settings')
                .select('*')
                .in('key', ['store_name', 'support_email', 'currency', 'tax_rate', 'gstin', 'maintenance_mode']);

            if (data) {
                const settings = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
                setStoreName(settings['store_name'] || 'Root & Loom');
                setSupportEmail(settings['support_email'] || '');
                setCurrency(settings['currency'] || 'USD');
                setTaxRate(settings['tax_rate'] || '0');
                setGstin(settings['gstin'] || '');
                setMaintenanceMode(settings['maintenance_mode'] === 'true');
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const updates = [
            { key: 'store_name', value: storeName },
            { key: 'support_email', value: supportEmail },
            { key: 'currency', value: currency },
            { key: 'tax_rate', value: taxRate },
            { key: 'gstin', value: gstin },
            { key: 'maintenance_mode', value: String(maintenanceMode) },
        ];

        const { error } = await supabase
            .from('store_settings')
            .upsert(updates);

        if (error) {
            toast.error('Failed to save settings');
            console.error(error);
        } else {
            toast.success('Store settings saved successfully');
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* Store Profile */}
            <Card>
                <CardHeader>
                    <CardTitle>Store Profile</CardTitle>
                    <CardDescription>General information about your store.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Store Name</Label>
                            <Input
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Support Email</Label>
                            <Input
                                value={supportEmail}
                                onChange={(e) => setSupportEmail(e.target.value)}
                                placeholder="support@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Input
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tax & Financials */}
            <Card>
                <CardHeader>
                    <CardTitle>Tax & Financials</CardTitle>
                    <CardDescription>Configure tax rates and GST details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tax Rate (%)</Label>
                            <Input
                                type="number"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>GSTIN</Label>
                            <Input
                                value={gstin}
                                onChange={(e) => setGstin(e.target.value)}
                                placeholder="GST Number"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Controls */}
            <Card>
                <CardHeader>
                    <CardTitle>System Controls</CardTitle>
                    <CardDescription>Advanced system configurations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="space-y-1">
                            <Label className="text-base">Maintenance Mode</Label>
                            <p className="text-sm text-gray-500">Enable this to show a maintenance page to visitors.</p>
                        </div>
                        <Switch
                            checked={maintenanceMode}
                            onCheckedChange={setMaintenanceMode}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>
        </form>
    );
}
