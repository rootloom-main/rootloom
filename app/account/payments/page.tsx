import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Info } from 'lucide-react';

export default function PaymentsPage() {
    return (
        <div className="max-w-3xl font-sans space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-medium text-deep-forest mb-2">
                    Payment Methods
                </h1>
                <p className="text-slate-500">
                    Manage your saved credit cards, UPI IDs, and billing preferences.
                </p>
            </div>

            <Card className="border border-stone-200/50 shadow-sm rounded-2xl bg-white">
                <CardHeader className="bg-stone-50/50 border-b border-stone-100 pb-4">
                    <CardTitle className="text-lg font-medium text-deep-forest flex items-center gap-2">
                        <CreditCard size={20} />
                        Saved Payment Options
                    </CardTitle>
                    <CardDescription>
                        Options you save during checkout will appear here.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 text-center py-12 space-y-4">
                    <div className="mx-auto w-12 h-12 bg-stone-50 border border-dashed border-stone-200 rounded-full flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-stone-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-stone-800">No saved payment methods</h4>
                        <p className="text-xs text-stone-400 mt-1">To protect your credentials, we utilize secure tokenization. Save details during your next purchase.</p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center gap-2.5 text-xs text-stone-500 bg-stone-50 border border-stone-150 p-4 rounded-xl">
                <Info className="h-4 w-4 shrink-0 text-stone-400" />
                <p>We comply fully with PCI-DSS standards. We never store raw card credentials on our servers.</p>
            </div>
        </div>
    );
}
