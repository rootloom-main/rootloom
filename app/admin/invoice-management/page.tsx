'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
    FileText, 
    ArrowUp, 
    ArrowDown, 
    Eye, 
    RotateCcw, 
    Copy, 
    Trash2, 
    Settings2, 
    Layout, 
    Code, 
    History, 
    Download, 
    Upload, 
    Check, 
    Building, 
    Percent, 
    HelpCircle,
    CheckCircle2,
    RefreshCw,
    Maximize2,
    Database,
    HelpCircle as InfoIcon
} from 'lucide-react';
import { formatCurrency, compileInvoiceTemplate, DEFAULT_BLOCKS, assembleHtmlFromLayout } from '@/lib/utils/invoice-compiler';

// Mock order for live A4 preview
const MOCK_ORDER = {
    order_number: "ORD202607111234",
    created_at: new Date().toISOString(),
    status: "processing",
    payment_status: "completed",
    payment_id: "pay_RazorpayMock123",
    subtotal: 3600.00,
    shipping_cost: 0.00,
    total: 3600.00,
    notes: "Please deliver between 9 AM and 5 PM. Leave at the front desk.",
    profiles: {
        full_name: "John Doe",
        email: "john.doe@example.com",
        phone: "+91 99999 88888"
    },
    shipping_address: {
        full_name: "John Doe",
        phone: "+91 99999 88888",
        address_line1: "Flat 402, Royal Residency, Park Street",
        address_line2: "Opposite City Mall, Sector 15",
        city: "Mumbai",
        state: "Maharashtra",
        postal_code: "400001",
        country: "India"
    },
    order_items: [
        {
            id: "item-1",
            quantity: 2,
            price: 1200.00,
            product: { name: "Vintage Oversized Tee" },
            variant: { size: "XL", color: "Sage Green" }
        },
        {
            id: "item-2",
            quantity: 1,
            price: 1200.00,
            product: { name: "Retro Cargo Pants" },
            variant: { size: "32", color: "Charcoal" }
        }
    ]
};

export default function InvoiceManagement() {
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Core state
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [role, setRole] = useState<string>('user');
    
    // DB Schema Missing Trigger
    const [dbSetupNeeded, setDbSetupNeeded] = useState(false);
    const [dbChecking, setDbChecking] = useState(false);

    // Active configuration state
    const [templateHtml, setTemplateHtml] = useState('');
    const [templateCss, setTemplateCss] = useState('');
    const [headerConfig, setHeaderConfig] = useState<any>({});
    const [footerConfig, setFooterConfig] = useState<any>({});
    const [taxConfig, setTaxConfig] = useState<any>({});
    const [layoutConfig, setLayoutConfig] = useState<any[]>([]);
    const [printSettings, setPrintSettings] = useState<any>({});

    // Live preview settings
    const [previewMode, setPreviewMode] = useState<'desktop' | 'print'>('print');
    const [liveHtml, setLiveHtml] = useState('');
    const [isVisualMode, setIsVisualMode] = useState(true);

    // SQL Schema script for setup copy
    const sqlSchemaText = `-- Invoice Template Schema Setup
CREATE TABLE IF NOT EXISTS public.invoice_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_template_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid REFERENCES public.invoice_templates(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    html text NOT NULL,
    css text DEFAULT '',
    header jsonb NOT NULL DEFAULT '{}'::jsonb,
    footer jsonb NOT NULL DEFAULT '{}'::jsonb,
    tax_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    layout_config jsonb NOT NULL DEFAULT '[]'::jsonb,
    print_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text DEFAULT 'draft',
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
    invoice_number text UNIQUE NOT NULL,
    template_version_id uuid REFERENCES public.invoice_template_versions(id) ON DELETE SET NULL,
    invoice_date timestamptz DEFAULT now(),
    company_name text,
    company_address text,
    company_details jsonb NOT NULL DEFAULT '{}'::jsonb,
    tax_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    layout_config jsonb NOT NULL DEFAULT '[]'::jsonb,
    html_snapshot text,
    css_snapshot text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-assets', 'invoice-assets', true) ON CONFLICT (id) DO NOTHING;`;

    // Fetch user role & template data
    useEffect(() => {
        checkUserRole();
        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep live preview HTML in sync with config edits
    useEffect(() => {
        let currentHtml = templateHtml;
        if (isVisualMode && layoutConfig.length > 0) {
            currentHtml = assembleHtmlFromLayout(layoutConfig);
        }

        const compiled = compileInvoiceTemplate(currentHtml, MOCK_ORDER, {
            header: headerConfig,
            footer: footerConfig,
            tax_config: taxConfig,
            layout_config: layoutConfig
        });
        setLiveHtml(compiled);
    }, [templateHtml, headerConfig, footerConfig, taxConfig, layoutConfig, isVisualMode]);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (profile) setRole(profile.role);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        setDbSetupNeeded(false);
        try {
            const res = await fetch('/api/admin/invoice-templates');
            if (res.status === 403) {
                toast.error("You do not have permissions to access Invoice Settings.");
                setLoading(false);
                return;
            }
            if (!res.ok) {
                const err = await res.json();
                // If tables do not exist, standard response will error
                const errorText = String(err.error || '');
                if (
                    err.setupRequired ||
                    errorText.includes('invoice_templates') ||
                    errorText.includes('relation') ||
                    errorText.includes('does not exist') ||
                    errorText.includes('Could not find the table') ||
                    errorText.includes('schema cache')
                ) {
                    setDbSetupNeeded(true);
                } else {
                    toast.error(err.error || 'Failed to load templates');
                }
                setLoading(false);
                return;
            }
            const data = await res.json();
            setTemplates(data);
            
            // Set first or default template as active
            if (data.length > 0) {
                const defaultTpl = data.find((t: any) => t.is_default) || data[0];
                selectTemplate(defaultTpl);
            }
        } catch (err: any) {
            console.error('Error fetching templates:', err);
            toast.error('Failed to communicate with template APIs');
        } finally {
            setLoading(false);
        }
    };

    const selectTemplate = async (template: any) => {
        setSelectedTemplate(template);
        if (!template) return;

        const activeVer = template.active_version;
        if (activeVer) {
            setTemplateHtml(activeVer.html || '');
            setTemplateCss(activeVer.css || '');
            setHeaderConfig(activeVer.header || {});
            setFooterConfig(activeVer.footer || {});
            setTaxConfig(activeVer.tax_config || {});
            setLayoutConfig(activeVer.layout_config || []);
            setPrintSettings(activeVer.print_settings || {});
        }

        // Fetch version history
        try {
            const res = await fetch(`/api/admin/invoice-templates/${template.id}/versions`);
            if (res.ok) {
                const vers = await res.json();
                setVersions(vers);
            }
        } catch (err) {
            console.error('Failed to load version logs:', err);
        }
    };

    const handleCreateTemplate = async () => {
        const name = prompt('Enter name for the new template:');
        if (!name) return;

        try {
            const res = await fetch('/api/admin/invoice-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, is_default: false })
            });

            if (res.ok) {
                toast.success('Template metadata created');
                fetchTemplates();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create template');
            }
        } catch (err) {
            toast.error('API connection failure');
        }
    };

    const handleSetDefault = async (templateId: string) => {
        try {
            const res = await fetch(`/api/admin/invoice-templates/${templateId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_default: true })
            });

            if (res.ok) {
                toast.success('Default template updated');
                fetchTemplates();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update defaults');
            }
        } catch (err) {
            toast.error('API connection failure');
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this template and all its versions?')) return;

        try {
            const res = await fetch(`/api/admin/invoice-templates/${templateId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Template deleted');
                fetchTemplates();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to delete template');
            }
        } catch (err) {
            toast.error('API connection failure');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'companyLogo' | 'upiQRCode' | 'signatureImage' | 'stampImage') => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.info(`Uploading image...`);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${fieldName}_${Date.now()}.${fileExt}`;
            const filePath = `invoice_assets/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('invoice-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('invoice-assets')
                .getPublicUrl(filePath);

            if (fieldName === 'companyLogo') {
                setHeaderConfig((prev: any) => ({ ...prev, companyLogo: publicUrl }));
            } else {
                setFooterConfig((prev: any) => ({ ...prev, [fieldName]: publicUrl }));
            }

            toast.success('Image uploaded successfully!');
        } catch (err: any) {
            console.error('Image upload failed:', err);
            toast.error('Upload failed: ' + err.message);
        }
    };

    const handleSaveVersion = async () => {
        if (!selectedTemplate) return;
        setSaving(true);

        const currentHtml = isVisualMode ? assembleHtmlFromLayout(layoutConfig) : templateHtml;

        try {
            const res = await fetch(`/api/admin/invoice-templates/${selectedTemplate.id}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: currentHtml,
                    css: templateCss,
                    header: headerConfig,
                    footer: footerConfig,
                    tax_config: taxConfig,
                    layout_config: layoutConfig,
                    print_settings: printSettings
                })
            });

            if (res.ok) {
                const newVer = await res.json();
                toast.success(`Saved new version #${newVer.version_number}!`);
                
                // Refresh template list and versions
                await fetchTemplates();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save configuration');
            }
        } catch (err) {
            toast.error('API connection failure');
        } finally {
            setSaving(false);
        }
    };

    const handleRestoreVersion = async (versionId: string) => {
        if (!selectedTemplate) return;
        if (!confirm('This will clone the selected older version configuration into a new active version. Continue?')) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/invoice-templates/${selectedTemplate.id}/versions/${versionId}/restore`, {
                method: 'POST'
            });

            if (res.ok) {
                toast.success('Restored selected configuration version!');
                fetchTemplates();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to restore version');
            }
        } catch (err) {
            toast.error('API connection failure');
        } finally {
            setSaving(false);
        }
    };

    const handleMoveSection = (index: number, direction: 'up' | 'down') => {
        const newLayout = [...layoutConfig];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLayout.length) return;
        
        const temp = newLayout[index];
        newLayout[index] = newLayout[targetIndex];
        newLayout[targetIndex] = temp;
        
        setLayoutConfig(newLayout);
    };

    const handleToggleSectionVisibility = (index: number, visible: boolean) => {
        const newLayout = [...layoutConfig];
        newLayout[index] = { ...newLayout[index], visible };
        setLayoutConfig(newLayout);
    };

    // Backup & restore templates
    const handleExportJson = () => {
        if (!selectedTemplate) return;
        const configData = {
            name: selectedTemplate.name,
            html: isVisualMode ? assembleHtmlFromLayout(layoutConfig) : templateHtml,
            css: templateCss,
            header: headerConfig,
            footer: footerConfig,
            tax_config: taxConfig,
            layout_config: layoutConfig,
            print_settings: printSettings
        };

        const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_${selectedTemplate.name.toLowerCase().replace(/ /g, '_')}_backup.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('JSON backup exported!');
    };

    const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const config = JSON.parse(evt.target?.result as string);
                if (!config.html) {
                    toast.error('Invalid configuration file. Missing HTML template.');
                    return;
                }

                // Update settings state
                setTemplateHtml(config.html);
                setTemplateCss(config.css || '');
                setHeaderConfig(config.header || {});
                setFooterConfig(config.footer || {});
                setTaxConfig(config.tax_config || {});
                setLayoutConfig(config.layout_config || []);
                setPrintSettings(config.print_settings || {});
                
                toast.success('Configuration loaded from backup JSON. Click "Save Config" to apply.');
            } catch (err) {
                toast.error('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    };

    const handleVerifyDatabase = async () => {
        setDbChecking(true);
        toast.info('Checking schema table integrity...');
        // Wait 1.5s for realistic system diagnostics feedback
        await new Promise(resolve => setTimeout(resolve, 1500));
        await fetchTemplates();
        setDbChecking(false);
        if (!dbSetupNeeded) {
            toast.success('Database verified! All tables exist.');
        }
    };

    const handleCopySQL = () => {
        navigator.clipboard.writeText(sqlSchemaText);
        toast.success('SQL schema copied to clipboard!');
    };

    const quickInsertPlaceholder = (placeholder: string) => {
        setTemplateHtml(prev => prev + ` {{${placeholder}}}`);
    };

    const isSuper = role === 'admin' || role === 'superadmin';

    // RENDER: Database setup state
    if (dbSetupNeeded) {
        return (
            <div className="container mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[80vh] bg-stone-50/50">
                <Card className="max-w-3xl w-full border border-stone-200 shadow-2xl overflow-hidden bg-white rounded-3xl">
                    <div className="bg-gradient-to-r from-[#0a0f1a] to-[#121c32] p-8 text-white flex items-center gap-4">
                        <div className="bg-[#bc8d68]/20 p-3 rounded-2xl border border-[#bc8d68]/30">
                            <Database className="h-8 w-8 text-[#bc8d68] animate-pulse" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-serif tracking-wide text-white">Database Setup Required</CardTitle>
                            <CardDescription className="text-stone-300 mt-1">
                                The invoice template tables need to be created in your Supabase database.
                            </CardDescription>
                        </div>
                    </div>
                    
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2 text-stone-600 text-sm">
                            <p className="font-bold text-stone-800">Please follow these quick steps:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-1">
                                <li>Log into your <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#bc8d68] underline font-bold">Supabase Dashboard</a>.</li>
                                <li>Navigate to the **SQL Editor** tab.</li>
                                <li>Click **New Query**, paste the copied SQL schema code below, and click **Run**.</li>
                                <li>Once applied, return here and click **Verify Schema** to initialize.</li>
                            </ol>
                        </div>

                        <div className="relative">
                            <div className="absolute top-4 right-4 z-10 flex gap-2">
                                <Button size="sm" variant="outline" className="bg-white/95 border-stone-200 text-stone-700 hover:bg-white hover:text-stone-900 shadow-sm" onClick={handleCopySQL}>
                                    <Copy className="h-3.5 w-3.5 mr-2" />
                                    Copy SQL
                                </Button>
                            </div>
                            <pre className="p-4 bg-stone-900 text-stone-200 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed h-[200px] border border-stone-800 shadow-inner">
                                {sqlSchemaText}
                            </pre>
                        </div>
                    </CardContent>

                    <CardFooter className="bg-stone-50 border-t border-stone-200 p-6 flex justify-between items-center">
                        <span className="text-xs text-stone-500 font-medium">Verification will check tables and buckets.</span>
                        <Button 
                            onClick={handleVerifyDatabase} 
                            disabled={dbChecking} 
                            className="bg-[#0a0f1a] hover:bg-[#121c32] text-white rounded-xl shadow-lg hover:shadow-xl px-6 transition-all duration-300 font-bold"
                        >
                            {dbChecking ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Verifying...
                                </>
                            ) : 'Verify Schema'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // RENDER: Main interface loading
    if (loading) {
        return (
            <div className="flex flex-col h-[70vh] justify-center items-center gap-4 text-stone-500 font-medium">
                <RefreshCw className="h-8 w-8 animate-spin text-[#bc8d68]" />
                <span>Syncing template repository...</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8 space-y-8 bg-stone-50/20">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold tracking-wide text-stone-900">Invoice Template Management</h1>
                    <p className="text-sm text-stone-500 mt-1">Configure company credentials, taxes, CSS styling, and section ordering without touching code.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* JSON Import button */}
                    {isSuper && (
                        <div className="relative">
                            <Input 
                                type="file" 
                                accept=".json" 
                                onChange={handleImportJson} 
                                className="hidden" 
                                id="import-config-input" 
                            />
                            <Button 
                                variant="outline" 
                                className="bg-white border-stone-200 rounded-xl hover:bg-stone-50 shadow-sm"
                                asChild
                            >
                                <label htmlFor="import-config-input" className="cursor-pointer flex items-center">
                                    <Upload className="h-4 w-4 mr-2 text-stone-500" />
                                    Import JSON
                                </label>
                            </Button>
                        </div>
                    )}
                    
                    {/* JSON Export button */}
                    <Button 
                        variant="outline" 
                        onClick={handleExportJson}
                        disabled={!selectedTemplate}
                        className="bg-white border-stone-200 rounded-xl hover:bg-stone-50 shadow-sm"
                    >
                        <Download className="h-4 w-4 mr-2 text-stone-500" />
                        Export JSON
                    </Button>

                    {/* Main Save Version button */}
                    {isSuper ? (
                        <Button 
                            onClick={handleSaveVersion} 
                            disabled={saving || !selectedTemplate}
                            className="bg-[#bc8d68] hover:bg-[#a37957] text-white rounded-xl shadow-lg hover:shadow-xl px-6 transition-all duration-300 font-bold"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : 'Save Config (V' + (selectedTemplate?.active_version?.version_number || 1) + ')'}
                        </Button>
                    ) : (
                        <div className="bg-amber-50 text-amber-800 text-xs px-4 py-2.5 rounded-xl border border-amber-200/50 flex items-center font-bold">
                            <InfoIcon className="h-4 w-4 mr-2 text-amber-600 flex-shrink-0" />
                            Only Super Admins can save changes
                        </div>
                    )}
                </div>
            </div>

            {/* Template selector cards */}
            <div className="grid md:grid-cols-3 gap-6">
                {templates.map((tpl) => {
                    const isSelected = selectedTemplate?.id === tpl.id;
                    const isActive = tpl.is_default;
                    return (
                        <Card 
                            key={tpl.id} 
                            onClick={() => selectTemplate(tpl)}
                            className={`cursor-pointer border-2 transition-all duration-300 rounded-2xl relative overflow-hidden group ${
                                isSelected 
                                    ? 'border-[#bc8d68] shadow-md bg-white' 
                                    : 'border-stone-200/60 shadow-sm bg-white/70 hover:border-stone-300 hover:bg-white'
                            }`}
                        >
                            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-lg font-serif font-bold text-stone-800 group-hover:text-stone-900 transition-colors">
                                        {tpl.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs font-mono text-stone-400 mt-1">
                                        Version: v{tpl.active_version?.version_number || 1}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-1.5 items-center">
                                    {isActive ? (
                                        <span className="text-[10px] font-bold text-[#bc8d68] bg-[#bc8d68]/10 border border-[#bc8d68]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            Default
                                        </span>
                                    ) : (
                                        isSuper && (
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="text-[10px] text-stone-400 hover:text-stone-800 hover:bg-stone-50 px-2 h-7"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSetDefault(tpl.id);
                                                }}
                                            >
                                                Make Default
                                            </Button>
                                        )
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pb-5 pt-0 flex justify-between items-center">
                                <span className="text-xs text-stone-400 font-medium">Updated: {new Date(tpl.updated_at).toLocaleDateString()}</span>
                                {isSuper && !isActive && (
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTemplate(tpl.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
                {isSuper && (
                    <Card 
                        onClick={handleCreateTemplate}
                        className="cursor-pointer border-2 border-dashed border-stone-300 hover:border-[#bc8d68] transition-all bg-stone-50/50 hover:bg-white flex flex-col justify-center items-center py-8 rounded-2xl min-h-[110px]"
                    >
                        <Layout className="h-6 w-6 text-stone-400 mb-1 group-hover:text-[#bc8d68]" />
                        <span className="text-sm font-bold text-stone-600 hover:text-stone-800">Add New Template</span>
                    </Card>
                )}
            </div>

            {/* Config & Editor controls and Live Preview workspace */}
            {selectedTemplate && (
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Configurations controls (Left side, 7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        <Tabs defaultValue="visual" className="w-full">
                            <TabsList className="grid grid-cols-5 w-full bg-stone-100 p-1 rounded-xl mb-6">
                                <TabsTrigger value="visual" onClick={() => setIsVisualMode(true)} className="rounded-lg font-bold text-xs">
                                    <Layout className="h-3.5 w-3.5 mr-1.5" />
                                    Layout
                                </TabsTrigger>
                                <TabsTrigger value="company" className="rounded-lg font-bold text-xs">
                                    <Building className="h-3.5 w-3.5 mr-1.5" />
                                    Company
                                </TabsTrigger>
                                <TabsTrigger value="tax" className="rounded-lg font-bold text-xs">
                                    <Percent className="h-3.5 w-3.5 mr-1.5" />
                                    Taxes
                                </TabsTrigger>
                                <TabsTrigger value="code" onClick={() => setIsVisualMode(false)} className="rounded-lg font-bold text-xs">
                                    <Code className="h-3.5 w-3.5 mr-1.5" />
                                    HTML/CSS
                                </TabsTrigger>
                                <TabsTrigger value="history" className="rounded-lg font-bold text-xs">
                                    <History className="h-3.5 w-3.5 mr-1.5" />
                                    History
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB: Layout builder */}
                            <TabsContent value="visual" className="space-y-4 outline-none">
                                <Card className="border border-stone-200/60 rounded-2xl shadow-sm bg-white">
                                    <CardHeader className="p-6">
                                        <CardTitle className="text-lg font-serif font-bold text-stone-800">Invoice Layout Builder</CardTitle>
                                        <CardDescription className="text-stone-400">Drag or reorder rows to relocate sections, and toggle their visibility in final invoice PDFs.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-2">
                                        {layoutConfig.length === 0 ? (
                                            <p className="text-xs text-stone-400 italic">No layout settings defined for this template. Use standard HTML editor.</p>
                                        ) : (
                                            layoutConfig.map((item, index) => (
                                                <div 
                                                    key={item.id} 
                                                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                                        item.visible 
                                                            ? 'bg-stone-50/50 border-stone-200' 
                                                            : 'bg-stone-100/30 border-stone-100 text-stone-400 line-through'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded">
                                                            Section {index + 1}
                                                        </span>
                                                        <span className="text-sm font-semibold">{item.name}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center space-x-2">
                                                            <Switch 
                                                                checked={item.visible} 
                                                                onCheckedChange={(checked) => handleToggleSectionVisibility(index, checked)}
                                                                disabled={!isSuper}
                                                            />
                                                            <span className="text-xs font-semibold select-none">Show</span>
                                                        </div>

                                                        {isSuper && (
                                                            <div className="flex items-center gap-1 border-l border-stone-200 pl-3">
                                                                <Button 
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-7 w-7 rounded hover:bg-stone-200/60"
                                                                    disabled={index === 0}
                                                                    onClick={() => handleMoveSection(index, 'up')}
                                                                >
                                                                    <ArrowUp className="h-3.5 w-3.5 text-stone-500" />
                                                                </Button>
                                                                <Button 
                                                                    size="icon" 
                                                                    variant="ghost" 
                                                                    className="h-7 w-7 rounded hover:bg-stone-200/60"
                                                                    disabled={index === layoutConfig.length - 1}
                                                                    onClick={() => handleMoveSection(index, 'down')}
                                                                >
                                                                    <ArrowDown className="h-3.5 w-3.5 text-stone-500" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* TAB: Company Details */}
                            <TabsContent value="company" className="space-y-4 outline-none">
                                <Card className="border border-stone-200/60 rounded-2xl shadow-sm bg-white">
                                    <CardHeader className="p-6">
                                        <CardTitle className="text-lg font-serif font-bold text-stone-800">Company & Bank Credentials</CardTitle>
                                        <CardDescription className="text-stone-400">Configure your trade name, billing details, and physical stamps or signatures.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 grid md:grid-cols-2 gap-5">
                                        {/* Company Details */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase text-stone-800 tracking-wider border-b border-stone-100 pb-2">Business info</h3>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Company Name</Label>
                                                <Input 
                                                    value={headerConfig.companyName || ''} 
                                                    onChange={(e) => setHeaderConfig({ ...headerConfig, companyName: e.target.value })}
                                                    disabled={!isSuper}
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Company Address</Label>
                                                <Textarea 
                                                    value={headerConfig.companyAddress || ''} 
                                                    onChange={(e) => setHeaderConfig({ ...headerConfig, companyAddress: e.target.value })}
                                                    disabled={!isSuper}
                                                    rows={3}
                                                    className="resize-none"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">GST Number</Label>
                                                    <Input 
                                                        value={headerConfig.gstNumber || ''} 
                                                        onChange={(e) => setHeaderConfig({ ...headerConfig, gstNumber: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">PAN Number</Label>
                                                    <Input 
                                                        value={headerConfig.panNumber || ''} 
                                                        onChange={(e) => setHeaderConfig({ ...headerConfig, panNumber: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">CIN Number</Label>
                                                    <Input 
                                                        value={headerConfig.cinNumber || ''} 
                                                        onChange={(e) => setHeaderConfig({ ...headerConfig, cinNumber: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Company Email</Label>
                                                    <Input 
                                                        value={headerConfig.email || ''} 
                                                        onChange={(e) => setHeaderConfig({ ...headerConfig, email: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Company Phone</Label>
                                                    <Input 
                                                        value={headerConfig.phone || ''} 
                                                        onChange={(e) => setHeaderConfig({ ...headerConfig, phone: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Website URL</Label>
                                                    <Input 
                                                        value={headerConfig.website || ''} 
                                                        onChange={(e) => setHeaderConfig({ ...headerConfig, website: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bank details & Images */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase text-stone-800 tracking-wider border-b border-stone-100 pb-2">Remittance coordinates</h3>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Bank Name</Label>
                                                <Input 
                                                    value={footerConfig.bankName || ''} 
                                                    onChange={(e) => setFooterConfig({ ...footerConfig, bankName: e.target.value })}
                                                    disabled={!isSuper}
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Beneficiary A/c Name</Label>
                                                <Input 
                                                    value={footerConfig.bankAccountName || ''} 
                                                    onChange={(e) => setFooterConfig({ ...footerConfig, bankAccountName: e.target.value })}
                                                    disabled={!isSuper}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Account Number</Label>
                                                    <Input 
                                                        value={footerConfig.bankAccountNumber || ''} 
                                                        onChange={(e) => setFooterConfig({ ...footerConfig, bankAccountNumber: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">IFSC Code</Label>
                                                    <Input 
                                                        value={footerConfig.bankIFSC || ''} 
                                                        onChange={(e) => setFooterConfig({ ...footerConfig, bankIFSC: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">UPI Address (For QR payments)</Label>
                                                <Input 
                                                    value={footerConfig.upiQRCode || ''} 
                                                    onChange={(e) => setFooterConfig({ ...footerConfig, upiQRCode: e.target.value })}
                                                    disabled={!isSuper}
                                                    placeholder="e.g. rootloom@okaxis"
                                                />
                                            </div>

                                            {/* File Asset Uploads */}
                                            {isSuper && (
                                                <div className="pt-2 grid grid-cols-2 gap-3">
                                                    <div className="grid gap-1">
                                                        <Label className="text-[10px] font-bold text-stone-500 uppercase">Logo image</Label>
                                                        <Input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            className="text-xs h-9 cursor-pointer"
                                                            onChange={(e) => handleImageUpload(e, 'companyLogo')}
                                                        />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label className="text-[10px] font-bold text-stone-500 uppercase">Signature Image</Label>
                                                        <Input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            className="text-xs h-9 cursor-pointer"
                                                            onChange={(e) => handleImageUpload(e, 'signatureImage')}
                                                        />
                                                    </div>
                                                    <div className="grid gap-1 col-span-2">
                                                        <Label className="text-[10px] font-bold text-stone-500 uppercase">Seal / Stamp Image</Label>
                                                        <Input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            className="text-xs h-9 cursor-pointer"
                                                            onChange={(e) => handleImageUpload(e, 'stampImage')}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Terms & Return policy */}
                                        <div className="col-span-2 space-y-4 mt-2">
                                            <h3 className="text-xs font-black uppercase text-stone-800 tracking-wider border-b border-stone-100 pb-2">Policies & Legal Notice</h3>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Terms & Conditions</Label>
                                                <Textarea 
                                                    value={footerConfig.termsAndConditions || ''} 
                                                    onChange={(e) => setFooterConfig({ ...footerConfig, termsAndConditions: e.target.value })}
                                                    disabled={!isSuper}
                                                    rows={3}
                                                    className="resize-none"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Return Policy</Label>
                                                <Textarea 
                                                    value={footerConfig.returnPolicy || ''} 
                                                    onChange={(e) => setFooterConfig({ ...footerConfig, returnPolicy: e.target.value })}
                                                    disabled={!isSuper}
                                                    rows={2}
                                                    className="resize-none"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Invoice Footer Text</Label>
                                                <Input 
                                                    value={headerConfig.footerText || footerConfig.footer || ''} 
                                                    onChange={(e) => setHeaderConfig({ ...headerConfig, footerText: e.target.value })}
                                                    disabled={!isSuper}
                                                    placeholder="Thank you for shopping. This is a computer generated invoice."
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* TAB: Tax Config */}
                            <TabsContent value="tax" className="space-y-4 outline-none">
                                <Card className="border border-stone-200/60 rounded-2xl shadow-sm bg-white">
                                    <CardHeader className="p-6">
                                        <CardTitle className="text-lg font-serif font-bold text-stone-800">Tax Configurations & Format rules</CardTitle>
                                        <CardDescription className="text-stone-400">Configure Indian GST metrics, rounding precision, currency parameters, and numbering conventions.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 grid md:grid-cols-2 gap-6">
                                        {/* Tax rates */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase text-stone-800 tracking-wider border-b border-stone-100 pb-2">Tax percentages</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">CGST % (Intrastate Central)</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={taxConfig.cgst ?? 9} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, cgst: parseFloat(e.target.value) || 0 })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">SGST % (Intrastate State)</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={taxConfig.sgst ?? 9} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, sgst: parseFloat(e.target.value) || 0 })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">IGST % (Interstate integrated)</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={taxConfig.igst ?? 18} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, igst: parseFloat(e.target.value) || 0 })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">VAT % (Alternative)</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={taxConfig.vat ?? 0} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, vat: parseFloat(e.target.value) || 0 })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Service Tax %</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={taxConfig.serviceTax ?? 0} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, serviceTax: parseFloat(e.target.value) || 0 })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Discount % (Default)</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={taxConfig.discount ?? 0} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, discount: parseFloat(e.target.value) || 0 })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Formatting and Prefixing */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase text-stone-800 tracking-wider border-b border-stone-100 pb-2">Formatting and prefixing</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Currency (ISO)</Label>
                                                    <Input 
                                                        value={taxConfig.currency || 'INR'} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, currency: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Currency Symbol</Label>
                                                    <Input 
                                                        value={taxConfig.currencySymbol || '₹'} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, currencySymbol: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Decimal Precision</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={taxConfig.decimalPrecision ?? 2} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, decimalPrecision: parseInt(e.target.value) || 0 })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Invoice Prefix</Label>
                                                    <Input 
                                                        value={taxConfig.invoicePrefix || 'INV-'} 
                                                        onChange={(e) => setTaxConfig({ ...taxConfig, invoicePrefix: e.target.value })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Invoice Number Format</Label>
                                                <Input 
                                                    value={taxConfig.invoiceNumberFormat || 'YYYYMMDD-####'} 
                                                    onChange={(e) => setTaxConfig({ ...taxConfig, invoiceNumberFormat: e.target.value })}
                                                    disabled={!isSuper}
                                                    placeholder="YYYYMMDD-####"
                                                />
                                            </div>
                                        </div>

                                        {/* Print Page Settings */}
                                        <div className="col-span-2 space-y-4 mt-2">
                                            <h3 className="text-xs font-black uppercase text-stone-800 tracking-wider border-b border-stone-100 pb-2">Paper & Page layouts</h3>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Paper Size</Label>
                                                    <select 
                                                        value={printSettings.paperSize || 'A4'}
                                                        onChange={(e) => setPrintSettings({ ...printSettings, paperSize: e.target.value })}
                                                        disabled={!isSuper}
                                                        className="h-10 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none"
                                                    >
                                                        <option value="A4">A4 (Standard)</option>
                                                        <option value="Letter">Letter (US)</option>
                                                    </select>
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Orientation</Label>
                                                    <select 
                                                        value={printSettings.orientation || 'portrait'}
                                                        onChange={(e) => setPrintSettings({ ...printSettings, orientation: e.target.value })}
                                                        disabled={!isSuper}
                                                        className="h-10 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:outline-none"
                                                    >
                                                        <option value="portrait">Portrait</option>
                                                        <option value="landscape">Landscape</option>
                                                    </select>
                                                </div>
                                                <div className="grid gap-1">
                                                    <Label className="text-xs">Page Margins (mm)</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={printSettings.margins?.top ?? 10} 
                                                        onChange={(e) => setPrintSettings({
                                                            ...printSettings,
                                                            margins: {
                                                                top: parseFloat(e.target.value) || 0,
                                                                bottom: parseFloat(e.target.value) || 0,
                                                                left: parseFloat(e.target.value) || 0,
                                                                right: parseFloat(e.target.value) || 0
                                                            }
                                                        })}
                                                        disabled={!isSuper}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* TAB: HTML/CSS Code Editor */}
                            <TabsContent value="code" className="space-y-4 outline-none">
                                <Card className="border border-stone-200/60 rounded-2xl shadow-sm bg-white">
                                    <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0">
                                        <div>
                                            <CardTitle className="text-lg font-serif font-bold text-stone-800">HTML & CSS Code Editor</CardTitle>
                                            <CardDescription className="text-stone-400">Directly edit the template markup. Placeholders will resolve automatically.</CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => setIsVisualMode(!isVisualMode)}
                                                className="h-8 rounded-lg"
                                            >
                                                {isVisualMode ? 'Unlock Raw Code' : 'Lock/Visual layout'}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0 space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Placeholders Quick-Insert</Label>
                                            <div className="flex flex-wrap gap-1.5 p-2.5 bg-stone-50 border rounded-xl max-h-[90px] overflow-y-auto">
                                                {['invoiceNumber', 'invoiceDate', 'customerName', 'customerAddress', 'customerEmail', 'customerPhone', 'items', 'subtotal', 'discount', 'tax', 'grandTotal', 'cgst', 'sgst', 'igst', 'paymentMethod', 'paymentStatus', 'orderId', 'footer', 'bankName', 'bankAccountNumber', 'bankIFSC', 'upiQRCode', 'signatureImage', 'stampImage'].map(tag => (
                                                    <Button 
                                                        key={tag} 
                                                        size="sm" 
                                                        variant="secondary"
                                                        onClick={() => quickInsertPlaceholder(tag)}
                                                        disabled={isVisualMode || !isSuper}
                                                        className="text-[10px] h-6 px-2 rounded-md hover:bg-stone-200"
                                                    >
                                                        +{tag}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid gap-4">
                                            <div className="grid gap-1">
                                                <Label className="text-xs">HTML Template</Label>
                                                <Textarea 
                                                    value={isVisualMode ? assembleHtmlFromLayout(layoutConfig) : templateHtml} 
                                                    onChange={(e) => setTemplateHtml(e.target.value)}
                                                    disabled={isVisualMode || !isSuper}
                                                    rows={15}
                                                    className="font-mono text-xs leading-relaxed focus-visible:ring-1 focus-visible:ring-stone-400"
                                                />
                                                {isVisualMode && (
                                                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                                                        * HTML is currently locked under layout builder assembling mode. Unlock above to modify raw HTML markup.
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="grid gap-1">
                                                <Label className="text-xs">Custom CSS Styles (Inlined in PDF)</Label>
                                                <Textarea 
                                                    value={templateCss} 
                                                    onChange={(e) => setTemplateCss(e.target.value)}
                                                    disabled={!isSuper}
                                                    rows={4}
                                                    className="font-mono text-xs leading-relaxed"
                                                    placeholder="h1 { color: #1c352d; } table { border: 1px solid #eee; }"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* TAB: Version history */}
                            <TabsContent value="history" className="space-y-4 outline-none">
                                <Card className="border border-stone-200/60 rounded-2xl shadow-sm bg-white">
                                    <CardHeader className="p-6">
                                        <CardTitle className="text-lg font-serif font-bold text-stone-800">Template Version History</CardTitle>
                                        <CardDescription className="text-stone-400">Roll back, duplicate, or preview historical states of this template.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0">
                                        <div className="border border-stone-100 rounded-xl overflow-hidden shadow-inner bg-stone-50/20">
                                            <table className="w-full text-sm text-left text-stone-500">
                                                <thead className="text-xs text-stone-700 uppercase bg-stone-100/80">
                                                    <tr>
                                                        <th className="px-4 py-3">Version</th>
                                                        <th className="px-4 py-3">Status</th>
                                                        <th className="px-4 py-3">Created At</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {versions.map((ver) => (
                                                        <tr key={ver.id} className="border-b border-stone-100 hover:bg-white transition-all">
                                                            <td className="px-4 py-3 font-bold text-stone-800">
                                                                Version {ver.version_number}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {ver.status === 'active' ? (
                                                                    <span className="text-[10px] font-bold text-[#bc8d68] bg-[#bc8d68]/15 border border-[#bc8d68]/20 px-2.5 py-0.5 rounded-full">
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-stone-400 font-medium">
                                                                        Archived
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {new Date(ver.created_at).toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="ghost" 
                                                                        className="h-8 rounded-lg text-stone-600 hover:text-stone-900"
                                                                        onClick={() => {
                                                                            // Load in preview without saving
                                                                            setTemplateHtml(ver.html || '');
                                                                            setTemplateCss(ver.css || '');
                                                                            setHeaderConfig(ver.header || {});
                                                                            setFooterConfig(ver.footer || {});
                                                                            setTaxConfig(ver.tax_config || {});
                                                                            setLayoutConfig(ver.layout_config || []);
                                                                            setPrintSettings(ver.print_settings || {});
                                                                            toast.info(`Preloaded Version ${ver.version_number} in live preview. Save to activate.`);
                                                                        }}
                                                                    >
                                                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                                                        Preview
                                                                    </Button>
                                                                    {isSuper && ver.status !== 'active' && (
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline" 
                                                                            className="h-8 rounded-lg border-stone-200 text-stone-700 hover:bg-stone-50"
                                                                            onClick={() => handleRestoreVersion(ver.id)}
                                                                        >
                                                                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                                                            Restore
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {versions.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-6 text-stone-400 italic">No version log history found.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Live Preview Panel (Right side, 5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        <Card className="border border-stone-200/60 rounded-2xl shadow-md overflow-hidden bg-white sticky top-6">
                            <CardHeader className="p-4 bg-gradient-to-r from-stone-900 to-stone-850 text-white flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                                    <span className="font-bold text-sm tracking-wider uppercase text-stone-100">Live Preview</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setPreviewMode(previewMode === 'print' ? 'desktop' : 'print')}
                                        className="h-8 text-[11px] font-bold px-3 py-1 bg-white/10 hover:bg-white/20 border-white/10 text-white rounded-lg"
                                    >
                                        {previewMode === 'print' ? 'A4 Print view' : 'Fit Desktop'}
                                    </Button>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-4 bg-stone-100/50 flex justify-center overflow-auto min-h-[500px] max-h-[750px] border-b border-stone-200">
                                {previewMode === 'print' ? (
                                    // A4 Portrait Page Frame Simulation
                                    <div 
                                        className="w-[595px] min-h-[842px] bg-white border border-stone-300 shadow-2xl p-6 relative overflow-hidden transition-all duration-300 rounded"
                                        style={{
                                            fontFamily: 'sans-serif',
                                            transform: 'scale(0.85)',
                                            transformOrigin: 'top center',
                                            marginBottom: '-100px' // adjust for scaled container
                                        }}
                                    >
                                        <style dangerouslySetInnerHTML={{ __html: templateCss }} />
                                        <div dangerouslySetInnerHTML={{ __html: liveHtml }} />
                                    </div>
                                ) : (
                                    // Desktop Full container view
                                    <div className="w-full bg-white border rounded-xl shadow-lg p-6 min-h-[400px]">
                                        <style dangerouslySetInnerHTML={{ __html: templateCss }} />
                                        <div dangerouslySetInnerHTML={{ __html: liveHtml }} />
                                    </div>
                                )}
                            </CardContent>
                            
                            <CardFooter className="p-4 bg-stone-50 flex justify-between items-center text-xs text-stone-500 font-medium">
                                <span>Preview aggregates real items with your configs</span>
                                <span className="font-semibold text-stone-700">INR Currency Mode</span>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
