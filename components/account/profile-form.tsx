'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateProfile } from '@/lib/actions/profile';
import { User, Phone, Mail, Save, Loader2, CheckCircle2, Circle, Camera, ArrowRight, ShieldCheck, Calendar, Info } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProfileFormProps {
    user: {
        email: string | null;
        phone?: string | null;
    };
    profile: {
        full_name: string | null;
        phone: string | null;
        email?: string | null;
        avatar_url?: string | null;
        dob?: string | null;
        gender?: string | null;
    };
    hasDefaultAddress: boolean;
}

function formatPhoneDisplay(raw: string | null | undefined): string {
    if (!raw) return '';
    const d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
    if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
    if (d.length > 10) return `+${d}`;
    return raw;
}

export function ProfileForm({ user, profile, hasDefaultAddress }: ProfileFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { refreshSession } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null);
    const [gender, setGender] = useState<string>(profile.gender || '');
    const [isSaveSuccessOpen, setIsSaveSuccessOpen] = useState(false);

    const hasName = !!profile.full_name?.trim();
    const hasPhone = !!profile.phone?.trim();
    const isProfileComplete = hasName && hasPhone && hasDefaultAddress;

    // Progress tracks only Name, Phone, and Address (email is 25%)
    const progress = 25 
        + (hasName ? 25 : 0) 
        + (hasPhone ? 25 : 0) 
        + (hasDefaultAddress ? 25 : 0);

    const authEmail = user.email;
    const profileEmail = profile.email;
    const hasAuthEmail = !!authEmail;

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image size must be less than 2MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Not logged in');

            const fileExt = file.name.split('.').pop();
            const filePath = `${authUser.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', authUser.id);

            if (profileError) throw profileError;

            setAvatarUrl(publicUrl);
            await refreshSession();
            toast.success('Profile picture updated successfully!');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to upload image');
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleRemoveAvatar() {
        setUploadingAvatar(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Not logged in');

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', authUser.id);

            if (profileError) throw profileError;

            setAvatarUrl(null);
            await refreshSession();
            toast.success('Profile picture removed successfully!');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove image');
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function clientAction(formData: FormData) {
        setIsSubmitting(true);
        // Include gender state explicitly since select inputs aren't standard form elements
        formData.set('gender', gender);
        try {
            const result = await updateProfile(null, formData);
            if (result.success) {
                await refreshSession();
                setIsSaveSuccessOpen(true);
                router.refresh();
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
        <div className="space-y-8 font-sans">
            
            {/* ── Non-blocking Suggestion Checklist Banner ── */}
            <Card className="border border-stone-200/50 shadow-sm rounded-2xl p-6 bg-white">
                {isProfileComplete ? (
                    <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 font-semibold text-sm">
                        <CheckCircle2 className="h-5 w-5 shrink-0 fill-emerald-100 text-emerald-600" />
                        <span>✓ Your profile is complete. Enjoy fast checkouts!</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                                <h3 className="font-serif font-bold text-lg text-deep-forest">Complete your profile</h3>
                                <p className="text-stone-500 text-xs mt-0.5">Finish setting up your details for a frictionless checkout experience.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Progress value={progress} className="h-2 w-28 bg-stone-100 [&>div]:bg-raw-clay" />
                                <span className="font-serif font-extrabold text-raw-clay text-sm shrink-0">{progress}% Setup</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-stone-600">
                            <span className="flex items-center gap-1 text-emerald-600 line-through"><CheckCircle2 className="h-4 w-4" /> Email Verified</span>
                            <span className={cn("flex items-center gap-1", hasName ? "text-emerald-600 line-through" : "text-stone-400")}>
                                {hasName ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} Full Name
                            </span>
                            <span className={cn("flex items-center gap-1", hasPhone ? "text-emerald-600 line-through" : "text-stone-400")}>
                                {hasPhone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} Phone Number
                            </span>
                            <span className={cn("flex items-center gap-1", hasDefaultAddress ? "text-emerald-600 line-through" : "text-stone-400")}>
                                {hasDefaultAddress ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />} Default Address
                            </span>
                        </div>
                    </div>
                )}
            </Card>

            {/* ── Main Edit Form ── */}
            <form action={clientAction}>
                <div className="grid gap-6">

                    {/* Profile Photo Card */}
                    <Card className="border-stone-100 shadow-sm rounded-2xl">
                        <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                            <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                                <Camera size={20} />
                                Profile Photo
                            </CardTitle>
                            <CardDescription>
                                Upload an avatar or picture for your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
                            
                            {/* Interactive Avatar */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="relative group cursor-pointer h-24 w-24 rounded-full border-2 border-stone-200 overflow-hidden shadow-md hover:ring-2 hover:ring-deep-forest hover:ring-offset-2 transition-all shrink-0">
                                        <Avatar className="h-full w-full">
                                            <AvatarImage src={avatarUrl || ''} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-deep-forest to-raw-clay text-white text-2xl font-bold">
                                                {(profile.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="h-6 w-6 text-white animate-pulse" />
                                        </div>
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-40 bg-white border border-stone-150 rounded-xl shadow-lg">
                                    <DropdownMenuItem onClick={triggerFileInput} className="cursor-pointer font-bold text-xs py-2 text-stone-700 hover:bg-stone-50">
                                        Upload Photo
                                    </DropdownMenuItem>
                                    {avatarUrl && (
                                        <DropdownMenuItem onClick={handleRemoveAvatar} className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs py-2">
                                            Remove Photo
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <input 
                                type="file" 
                                ref={fileInputRef}
                                accept="image/*" 
                                onChange={handleAvatarChange} 
                                className="hidden" 
                                disabled={uploadingAvatar} 
                            />

                            <div className="space-y-1 text-center sm:text-left">
                                <p className="text-sm font-semibold text-stone-900">Click avatar to manage photo</p>
                                <p className="text-xs text-stone-500">Allowed formats: PNG, JPG or WEBP. Max size: 2MB.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card className="border-stone-100 shadow-sm rounded-2xl">
                        <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                            <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                                <User size={20} />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Update your name and contact details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            
                            {/* Full Name */}
                            <div className="grid gap-2">
                                <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="fullName"
                                        name="fullName"
                                        defaultValue={profile.full_name || ''}
                                        className="pl-9 rounded-xl h-11 focus-visible:ring-deep-forest"
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
                                                className="pl-9 bg-slate-50 text-slate-500 cursor-not-allowed rounded-xl h-11 border-stone-200"
                                                readOnly
                                                disabled
                                            />
                                            <CheckCircle2 className="absolute right-3 top-3.5 h-4 w-4 text-green-500" />
                                            <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1"><Info className="h-3.5 w-3.5 text-stone-400" /> Email is verified and used for primary communication. It cannot be changed.</p>
                                        </>
                                    ) : (
                                        <>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                className="pl-9 rounded-xl h-11"
                                                defaultValue={profileEmail || ''}
                                                placeholder="Add your email address"
                                                autoComplete="email"
                                            />
                                            <p className="text-[11px] text-stone-500 mt-1">
                                                Add your email to receive order receipts and tracking updates.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Optional Fields: DOB & Gender */}
                    <Card className="border-stone-100 shadow-sm rounded-2xl">
                        <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                            <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                                <Calendar size={20} />
                                Demographic details (Optional)
                            </CardTitle>
                            <CardDescription>
                                Add your birthdate and gender for personalized privileges.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 grid md:grid-cols-2 gap-5">
                            
                            {/* DOB */}
                            <div className="grid gap-2">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <div className="relative">
                                    <Input
                                        id="dob"
                                        name="dob"
                                        type="date"
                                        defaultValue={profile.dob || ''}
                                        className="rounded-xl h-11 focus-visible:ring-deep-forest pr-4"
                                    />
                                </div>
                            </div>

                            {/* Gender */}
                            <div className="grid gap-2">
                                <Label htmlFor="gender">Gender</Label>
                                <Select value={gender} onValueChange={setGender}>
                                    <SelectTrigger className="h-11 rounded-xl border-stone-200 focus:ring-deep-forest">
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-stone-150 rounded-xl shadow-lg">
                                        <SelectItem value="male" className="cursor-pointer py-2">Male</SelectItem>
                                        <SelectItem value="female" className="cursor-pointer py-2">Female</SelectItem>
                                        <SelectItem value="non-binary" className="cursor-pointer py-2">Non-binary</SelectItem>
                                        <SelectItem value="prefer-not-to-say" className="cursor-pointer py-2">Prefer not to say</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Details */}
                    <Card className="border-stone-100 shadow-sm rounded-2xl">
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
                                        className="pl-9 rounded-xl h-11"
                                        placeholder="+91 98765 43210"
                                        type="tel"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Used for WhatsApp order notifications and delivery updates.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4 mt-2">
                        <Button type="submit" disabled={isSubmitting} className="min-w-[160px] bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full shadow-md uppercase tracking-wider text-xs font-bold h-12">
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

            {/* ── Success and Next-Steps Prompt Modal ── */}
            <Dialog open={isSaveSuccessOpen} onOpenChange={setIsSaveSuccessOpen}>
                <DialogContent className="sm:max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-2xl">
                    <DialogHeader className="flex flex-col items-center text-center space-y-4 pt-4">
                        {/* Beautiful icon animation container */}
                        <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600 fill-emerald-100/50 animate-bounce" />
                            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping [animation-duration:2s]" />
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="font-serif text-2xl font-bold text-deep-forest">
                                Settings Saved Successfully
                            </DialogTitle>
                            <DialogDescription className="text-stone-500 text-sm">
                                Your personal profile details have been securely updated.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {/* Asking the user next steps */}
                    <div className="mt-4 border-t border-stone-100 pt-6">
                        {!hasDefaultAddress ? (
                            <div className="space-y-4 text-center">
                                <h4 className="font-serif font-bold text-stone-900 text-base">Complete your shipping setup?</h4>
                                <p className="text-stone-500 text-xs leading-relaxed">
                                    We noticed you haven&apos;t added a default delivery address. Add it now to enjoy frictionless one-click checkouts on your future orders.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                    <Button
                                        onClick={() => {
                                            setIsSaveSuccessOpen(false);
                                            router.push('/account/addresses');
                                        }}
                                        className="w-full sm:w-auto bg-deep-forest hover:bg-deep-forest/90 text-white rounded-full px-6 font-bold uppercase tracking-wider text-xs h-11"
                                    >
                                        Add Address <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsSaveSuccessOpen(false)}
                                        className="w-full sm:w-auto border-stone-200 text-stone-600 hover:bg-stone-50 rounded-full px-6 font-bold uppercase tracking-wider text-xs h-11"
                                    >
                                        Maybe Later
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 text-center">
                                <h4 className="font-serif font-bold text-stone-900 text-base">Ready to discover your style?</h4>
                                <p className="text-stone-500 text-xs leading-relaxed">
                                    Your account is now fully optimized and ready. Explore our latest hand-woven, premium artisan collections.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                    <Button
                                        onClick={() => {
                                            setIsSaveSuccessOpen(false);
                                            router.push('/shop');
                                        }}
                                        className="w-full sm:w-auto bg-raw-clay hover:bg-raw-clay/90 text-white rounded-full px-6 font-bold uppercase tracking-wider text-xs h-11"
                                    >
                                        Start Shopping <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsSaveSuccessOpen(false);
                                            router.push('/account');
                                        }}
                                        className="w-full sm:w-auto border-stone-200 text-stone-600 hover:bg-stone-50 rounded-full px-6 font-bold uppercase tracking-wider text-xs h-11"
                                    >
                                        Go to Dashboard
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
