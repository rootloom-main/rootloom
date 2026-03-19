'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateProfile } from '@/lib/actions/profile';
import { User, Phone, Mail, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileFormProps {
    user: {
        email: string | null;
        phone?: string | null;
    };
    profile: {
        full_name: string | null;
        phone: string | null;
        email?: string | null;
    };
}

/** Format a raw phone string like "917209853850" → "+91 72098 53850" */
function formatPhoneDisplay(raw: string | null | undefined): string {
    if (!raw) return '';
    const d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
    if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
    if (d.length > 10) return `+${d}`;
    return raw;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    // If user has an email in the auth system, it's our primary email. 
    // Otherwise we use the one stored in the profile table.
    const authEmail = user.email;
    const profileEmail = profile.email;
    const hasAuthEmail = !!authEmail;

    async function clientAction(formData: FormData) {
        setIsSubmitting(true);
        try {
            const result = await updateProfile(null, formData);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form action={clientAction}>
            <div className="grid gap-6">
                {/* Personal Information */}
                <Card className="border-stone-100 shadow-sm">
                    <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                        <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                            <User size={20} />
                            Personal Information
                        </CardTitle>
                        <CardDescription>
                            Update your name and contact details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        {/* Full Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    defaultValue={profile.full_name || ''}
                                    className="pl-9"
                                    placeholder="e.g. Samir Pandey"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">
                                Email Address (for order updates)
                                {hasAuthEmail && (
                                    <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                        Verified
                                    </span>
                                )}
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                {hasAuthEmail ? (
                                    <>
                                        <Input
                                            id="email"
                                            value={authEmail || ''}
                                            className="pl-9 bg-slate-50 text-slate-500 cursor-not-allowed"
                                            readOnly
                                            disabled
                                        />
                                        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                                        <p className="text-xs text-slate-500 mt-1">Email is verified and used for primary communication.</p>
                                    </>
                                ) : (
                                    <>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            className="pl-9"
                                            defaultValue={profileEmail || ''}
                                            placeholder="Add your email address"
                                            autoComplete="email"
                                        />
                                        <p className="text-xs text-stone-500 mt-1">
                                            Add your email to receive order receipts and tracking updates.
                                            OTP login remains your primary login method.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Details */}
                <Card className="border-stone-100 shadow-sm">
                    <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                        <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                            <Phone size={20} />
                            Contact Details
                        </CardTitle>
                        <CardDescription>
                            Manage your phone number for WhatsApp order updates.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="phone"
                                    name="phone"
                                    defaultValue={
                                        profile.phone || formatPhoneDisplay(user.phone || '')
                                    }
                                    className="pl-9"
                                    placeholder="+91 98765 43210"
                                    type="tel"
                                />
                            </div>
                            <p className="text-xs text-slate-500">Used for WhatsApp order notifications and delivery updates.</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto min-w-[160px] bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full shadow-md">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
