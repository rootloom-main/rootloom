import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Mail, ShieldAlert, KeyRound } from 'lucide-react';
import { getCurrentUser } from '@/lib/utils/auth';

export default async function SecurityPage() {
    const user = await getCurrentUser();

    return (
        <div className="max-w-3xl font-sans space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-medium text-deep-forest mb-2">
                    Login & Security
                </h1>
                <p className="text-slate-500">
                    Manage your credentials, verify security status, and monitor sign-in credentials.
                </p>
            </div>

            <Card className="border border-stone-200/50 shadow-sm rounded-2xl bg-white">
                <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                    <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                        <ShieldCheck size={20} />
                        Identity Verification Status
                    </CardTitle>
                    <CardDescription>
                        We use secure passwordless keys to verify your identity.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-emerald-50/40 border border-emerald-100/50 rounded-xl">
                        <div className="h-10 w-10 bg-emerald-50 rounded-full border border-emerald-100/50 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-stone-900">Passwordless Authentication Active</p>
                            <p className="text-xs text-stone-500 leading-relaxed">
                                Your account is secure. No passwords are stored. Secure login verification codes (OTP) are sent directly to your verified inbox at <span className="font-bold text-stone-750 break-all">{user?.email}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="divide-y divide-stone-100">
                        <div className="py-4 first:pt-0 flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-stone-400" /> Registered Email Address
                                </p>
                                <p className="text-xs text-stone-500">{user?.email}</p>
                            </div>
                            <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                Verified
                            </span>
                        </div>

                        <div className="py-4 flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-stone-900 flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-stone-400" /> Active Sessions
                                </p>
                                <p className="text-xs text-stone-500">Currently logged in on this browser session.</p>
                            </div>
                            <span className="text-[10px] bg-stone-50 text-stone-500 border border-stone-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                Current
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center gap-2.5 text-xs text-stone-500 bg-stone-50 border border-stone-150 p-4 rounded-xl">
                <ShieldAlert className="h-4 w-4 shrink-0 text-stone-400" />
                <p>Never share your 6-digit OTP login code with anyone. Root & Loom support staff will never ask for your code.</p>
            </div>
        </div>
    );
}
