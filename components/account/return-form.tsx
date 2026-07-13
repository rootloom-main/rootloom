'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatPrice } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ReturnFormProps {
    order: any;
}

export function ReturnForm({ order }: ReturnFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [requestType, setRequestType] = useState<'refund' | 'exchange'>('refund');
    const isCOD = order.payment_id?.startsWith('COD_');
    const [refundMethod, setRefundMethod] = useState<'original_source' | 'bank_transfer' | 'upi'>(
        isCOD ? 'bank_transfer' : 'original_source'
    );
    const [bankDetails, setBankDetails] = useState({
        accountHolder: '',
        accountNumber: '',
        ifsc: '',
        upiId: '',
    });

    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleBankDetailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBankDetails(prev => ({ ...prev, [name]: value }));
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);

        formData.append('requestType', requestType);
        formData.append('refundMethod', refundMethod);
        
        if (isCOD) {
            formData.append('refundDetails', JSON.stringify(bankDetails));
        }

        // Re-append the file if it was picked but the input was hidden
        if (selectedFile) {
            formData.set('image', selectedFile);
        }

        try {
            const response = await fetch('/api/user/returns', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit request');
            }

            toast.success('Return requested successfully!');
            router.push(result.redirectUrl);
            router.refresh();
        } catch (err: any) {
            console.error('Return submission error:', err);
            toast.error(err.message || 'Something went wrong. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6"
        >
            <input type="hidden" name="orderId" value={order.id} />

            <div className="space-y-4">
                <Label className="text-base font-semibold text-deep-forest">What would you like to do?</Label>
                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Refund Option */}
                    <div
                        onClick={() => setRequestType('refund')}
                        className={cn(
                            "cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden",
                            requestType === 'refund'
                                ? "border-deep-forest bg-stone-50"
                                : "border-stone-200 hover:border-stone-300"
                        )}
                    >
                        {requestType === 'refund' && (
                            <div className="absolute top-4 right-4 h-3 w-3 bg-deep-forest rounded-full shadow-[0_0_0_4px_rgba(20,40,20,0.1)]" />
                        )}
                        <h3 className="font-bold text-lg text-deep-forest mb-1">Refund</h3>
                        <p className="text-sm text-stone-500">Return the item and get your money back.</p>
                    </div>

                    {/* Exchange Option */}
                    <div
                        onClick={() => setRequestType('exchange')}
                        className={cn(
                            "cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden",
                            requestType === 'exchange'
                                ? "border-deep-forest bg-stone-50"
                                : "border-stone-200 hover:border-stone-300"
                        )}
                    >
                        {requestType === 'exchange' && (
                            <div className="absolute top-4 right-4 h-3 w-3 bg-deep-forest rounded-full shadow-[0_0_0_4px_rgba(20,40,20,0.1)]" />
                        )}
                        <h3 className="font-bold text-lg text-deep-forest mb-1">Exchange</h3>
                        <p className="text-sm text-stone-500">Get a replacement or a different size/color.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-2">
                <Label className="text-base font-semibold text-deep-forest">Select Item to {requestType === 'refund' ? 'Return' : 'Exchange'}</Label>
                <div className="grid gap-3">
                    {order.order_items.map((item: any) => (
                        <div
                            key={item.id}
                            className={`flex items-start gap-4 p-4 border rounded-xl transition-all cursor-pointer hover:border-deep-forest/30 bg-white shadow-sm`}
                        >
                            <input
                                type="radio"
                                name="orderItemId"
                                value={item.id}
                                id={`item-${item.id}`}
                                required
                                className="mt-1.5 accent-deep-forest"
                            />
                            <label htmlFor={`item-${item.id}`} className="flex-1 cursor-pointer">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="font-semibold text-deep-forest truncate max-w-[200px]">{item.product?.name}</p>
                                        <p className="text-xs text-slate-bark">
                                            Size: {item.variant?.size} • Color: {item.variant?.color} • Qty: {item.quantity}
                                        </p>
                                    </div>
                                    <p className="font-bold text-deep-forest">{formatPrice(item.price)}</p>
                                </div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="reason" className="text-base font-semibold text-deep-forest">Reason for Return</Label>
                <Select name="reason" required>
                    <SelectTrigger className="h-12 border-stone-200 shadow-sm rounded-xl">
                        <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="wrong_size">Wrong Size</SelectItem>
                        <SelectItem value="damaged">Damaged / Defective</SelectItem>
                        <SelectItem value="not_as_described">Not as Described</SelectItem>
                        <SelectItem value="changed_mind">Changed Mind</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {requestType === 'refund' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="pt-4 border-t border-stone-100">
                        <Label className="text-base font-semibold text-deep-forest">How should we refund you?</Label>
                        <div className="grid sm:grid-cols-2 gap-4 mt-4">
                            {!isCOD && (
                                <div
                                    onClick={() => setRefundMethod('original_source')}
                                    className={cn(
                                        "cursor-pointer p-4 rounded-xl border-2 transition-all",
                                        refundMethod === 'original_source'
                                            ? "border-deep-forest bg-stone-50"
                                            : "border-stone-100 hover:border-stone-200"
                                    )}
                                >
                                    <h4 className="font-bold text-deep-forest">Original Payment Method</h4>
                                    <p className="text-xs text-stone-500 mt-1">Refund back to your card/wallet.</p>
                                </div>
                            )}
                            <div
                                onClick={() => setRefundMethod('bank_transfer')}
                                className={cn(
                                    "cursor-pointer p-4 rounded-xl border-2 transition-all",
                                    refundMethod === 'bank_transfer'
                                        ? "border-deep-forest bg-stone-50"
                                        : "border-stone-100 hover:border-stone-200"
                                )}
                            >
                                <h4 className="font-bold text-deep-forest">Bank Transfer</h4>
                                <p className="text-xs text-stone-500 mt-1">Sent directly to your bank account.</p>
                            </div>
                            <div
                                onClick={() => setRefundMethod('upi')}
                                className={cn(
                                    "cursor-pointer p-4 rounded-xl border-2 transition-all",
                                    refundMethod === 'upi'
                                        ? "border-deep-forest bg-stone-50"
                                        : "border-stone-100 hover:border-stone-200"
                                )}
                            >
                                <h4 className="font-bold text-deep-forest">UPI Refund</h4>
                                <p className="text-xs text-stone-500 mt-1">Instant refund via UPI ID.</p>
                            </div>
                        </div>
                    </div>

                    {refundMethod === 'bank_transfer' && (
                        <div className="grid gap-4 bg-stone-50 p-5 rounded-2xl border border-stone-200 shadow-inner">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">Account Holder Name</Label>
                                    <input
                                        type="text"
                                        name="accountHolder"
                                        required
                                        value={bankDetails.accountHolder}
                                        onChange={handleBankDetailChange}
                                        className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:ring-2 ring-deep-forest/20 outline-none"
                                        placeholder="Name as per bank"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">IFSC Code</Label>
                                    <input
                                        type="text"
                                        name="ifsc"
                                        required
                                        value={bankDetails.ifsc}
                                        onChange={handleBankDetailChange}
                                        className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:ring-2 ring-deep-forest/20 outline-none uppercase"
                                        placeholder="HDFC0001234"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">Account Number</Label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    required
                                    value={bankDetails.accountNumber}
                                    onChange={handleBankDetailChange}
                                    className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:ring-2 ring-deep-forest/20 outline-none"
                                    placeholder="Enter your account number"
                                />
                            </div>
                        </div>
                    )}

                    {refundMethod === 'upi' && (
                        <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 shadow-inner">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">UPI ID</Label>
                                <input
                                    type="text"
                                    name="upiId"
                                    required
                                    value={bankDetails.upiId}
                                    onChange={handleBankDetailChange}
                                    className="w-full h-11 px-4 rounded-xl border border-stone-200 focus:ring-2 ring-deep-forest/20 outline-none"
                                    placeholder="username@bank"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="comments" className="text-base font-semibold text-deep-forest">Additional Comments (Optional)</Label>
                <Textarea
                    name="comments"
                    id="comments"
                    placeholder="Please provide more details about the issue..."
                    rows={3}
                    className="border-stone-200 resize-none focus-visible:ring-deep-forest"
                />
            </div>

            <div className="space-y-4">
                <Label htmlFor="image" className="text-base font-semibold text-deep-forest">
                    Upload Photo Evidence <span className="text-red-500">*</span>
                </Label>

                <div className={cn("group relative mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-200 border-dashed rounded-xl hover:border-deep-forest hover:bg-stone-50 transition-all cursor-pointer", previewUrl && "hidden")}>
                    <div className="space-y-2 text-center">
                        <Upload className="mx-auto h-10 w-10 text-stone-400 group-hover:text-deep-forest transition-colors" />
                        <div className="flex text-sm text-gray-600">
                            <label
                                htmlFor="image"
                                className="relative cursor-pointer rounded-md font-bold text-deep-forest hover:text-deep-forest/80 focus-within:outline-none"
                            >
                                <span>Click to upload</span>
                                <input
                                    id="image"
                                    name="image"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    required={!previewUrl}
                                />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-stone-400 font-medium">PNG, JPG, GIF up to 10MB</p>
                    </div>
                </div>

                {previewUrl && (
                    <div className="relative mt-1 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 p-2 animate-in fade-in zoom-in duration-300">
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-stone-200 shadow-inner bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="h-full w-full object-contain"
                            />
                            <button
                                type="button"
                                onClick={removeFile}
                                className="absolute top-3 right-3 p-2 bg-red-500/90 text-white rounded-full hover:bg-red-600 shadow-xl transition-all hover:scale-110 active:scale-95 z-10"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 px-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-xs font-bold text-deep-forest truncate uppercase tracking-wider">
                                {selectedFile?.name}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-deep-forest hover:bg-deep-forest/90 text-white font-bold tracking-wide rounded-xl shadow-lg transition-all active:scale-[0.98]"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        SUBMITTING REQUEST...
                    </>
                ) : (
                    'SUBMIT RETURN REQUEST'
                )}
            </Button>
        </form>
    );
}
