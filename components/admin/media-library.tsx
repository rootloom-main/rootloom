'use client';

import { useState, useEffect } from 'react';
import { 
    Search, 
    Upload, 
    X, 
    Check, 
    Loader2, 
    Image as ImageIcon, 
    Trash2,
    Grid,
    List,
    Plus,
    ExternalLink
} from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MediaLibraryProps {
    bucketName: string;
    onSelect: (url: string) => void;
    currentUrl?: string;
    trigger?: React.ReactNode;
}

export function MediaLibrary({ bucketName, onSelect, currentUrl, trigger }: MediaLibraryProps) {
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUrl, setSelectedUrl] = useState(currentUrl || '');
    const supabase = createClient();

    useEffect(() => {
        if (open) {
            console.log('MediaLibrary: Dialog opened for bucket:', bucketName);
            fetchFiles();
        }
    }, [open, bucketName]);

    useEffect(() => {
        console.log('MediaLibrary: selectedUrl updated:', selectedUrl);
    }, [selectedUrl]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.storage.from(bucketName).list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });

            if (error) throw error;
            setFiles(data || []);
        } catch (error: any) {
            console.error('Error fetching files:', error);
            toast.error('Failed to load media library');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            toast.success('Image uploaded successfully');
            fetchFiles();
            setSelectedUrl(publicUrl);
        } catch (error: any) {
            console.error('Error uploading file:', error);
            toast.error(error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (fileName: string) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        
        try {
            const { error } = await supabase.storage.from(bucketName).remove([fileName]);
            if (error) throw error;
            
            toast.success('File deleted');
            fetchFiles();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete file');
        }
    };

    const filteredFiles = files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (file: any) => {
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(file.name);
        setSelectedUrl(publicUrl);
    };

    const confirmSelection = () => {
        if (!selectedUrl) {
            toast.error('No asset selected');
            return;
        }
        
        console.log('MediaLibrary: Confirming selection:', selectedUrl);
        try {
            onSelect(selectedUrl);
            setOpen(false);
        } catch (error) {
            console.error('MediaLibrary: Error in onSelect callback:', error);
            toast.error('Failed to select asset');
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Media Library
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
                        <ImageIcon className="h-6 w-6 text-indigo-500" />
                        Asset Library
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="browse" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 py-2 border-b bg-slate-50/50">
                        <TabsList className="bg-transparent border-0 gap-8 h-10 p-0">
                            <TabsTrigger 
                                value="browse" 
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 text-xs font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600"
                            >
                                Browse Files
                            </TabsTrigger>
                            <TabsTrigger 
                                value="upload" 
                                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-0 text-xs font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600"
                            >
                                Upload New
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="browse" className="flex-1 flex flex-col p-6 overflow-hidden mt-0">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search assets..." 
                                    className="pl-10 h-10 bg-slate-100 border-0 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" onClick={fetchFiles} className="rounded-xl">
                                <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
                            </Button>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Loading your vault...</p>
                                </div>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-4 border-dashed border-slate-100 rounded-[2rem] p-12">
                                <ImageIcon className="h-16 w-16 text-slate-200 mb-4" />
                                <p className="text-lg font-black uppercase italic text-slate-300">No assets found</p>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Start by uploading your first campaign asset</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredFiles.map((file) => {
                                    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(file.name);
                                    const isSelected = selectedUrl === publicUrl;
                                    
                                    return (
                                        <div 
                                            key={file.id} 
                                            className={cn(
                                                "group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all hover:scale-[1.02] active:scale-[0.98]",
                                                isSelected ? "border-indigo-600 scale-[1.02]" : "border-slate-100 hover:border-slate-200"
                                            )}
                                            onClick={() => handleSelect(file)}
                                        >
                                            <Image 
                                                src={publicUrl} 
                                                alt={file.name} 
                                                fill 
                                                className="object-cover"
                                            />
                                            {isSelected && (
                                                <div className="absolute inset-x-0 bottom-0 bg-indigo-600 text-white p-1 flex justify-center">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(file.name);
                                                    }}
                                                    className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="upload" className="flex-1 p-6 flex flex-col items-center justify-center mt-0">
                        <div className="w-full max-w-md">
                            <label 
                                htmlFor="asset-upload"
                                className="flex flex-col items-center justify-center w-full aspect-video border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-indigo-300 transition-all group"
                            >
                                <div className="flex flex-col items-center justify-center p-10 text-center">
                                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                        {uploading ? <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" /> : <Plus className="h-8 w-8 text-slate-400 group-hover:text-indigo-500" />}
                                    </div>
                                    <p className="text-lg font-black uppercase italic text-slate-800">Drop asset here</p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">or click to browse local files</p>
                                    <p className="text-[10px] text-slate-300 mt-4 px-8 leading-relaxed uppercase font-black">PNG, JPG, WEBP • Max 5MB • Optimized for Web</p>
                                </div>
                                <Input 
                                    id="asset-upload"
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleUpload}
                                    disabled={uploading}
                                />
                            </label>

                            {selectedUrl && (
                                <div className="mt-8 p-4 bg-white border border-slate-100 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="relative h-16 w-16 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                        <Image src={selectedUrl} alt="Preview" fill className="object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Upload Ready</p>
                                        <p className="text-xs font-bold truncate text-slate-800">{selectedUrl.split('/').pop()}</p>
                                    </div>
                                    <Button size="sm" onClick={confirmSelection} className="rounded-xl bg-slate-900 font-bold uppercase text-[10px] tracking-widest">
                                        Confirm
                                    </Button>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="p-6 border-t bg-slate-50/50 flex-row justify-between items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium truncate max-w-[50%]">
                        <ImageIcon className="h-3 w-3" />
                        <span className="truncate">{selectedUrl || "No asset selected"}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl uppercase text-[10px] font-black tracking-widest text-slate-500">
                            Cancel
                        </Button>
                        <Button 
                            disabled={!selectedUrl || uploading} 
                            onClick={confirmSelection}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg px-8 uppercase text-[10px] font-black tracking-widest transition-all active:scale-95 disabled:bg-slate-200"
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Select Asset'
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
