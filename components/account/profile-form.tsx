'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateProfile } from '@/lib/actions/profile';
import { User, Phone, Mail, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileFormProps {
    user: {
        email: string;
    };
    profile: {
        full_name: string | null;
        phone: string | null;
    };
}


export function ProfileForm({ user, profile }: ProfileFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function clientAction(formData: FormData) {
        setIsSubmitting(true);
        try {
            const result = await updateProfile(null, formData);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
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
                            Update your personal details here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    defaultValue={profile.full_name || ''}
                                    className="pl-9"
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    value={user.email}
                                    className="pl-9 bg-slate-50 text-slate-500"
                                    readOnly
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-slate-500">Email address cannot be changed.</p>
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
                            Manage your contact information.
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
                                    defaultValue={profile.phone || ''}
                                    className="pl-9"
                                    placeholder="Enter your phone number"
                                    type="tel"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto min-w-[140px]">
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
