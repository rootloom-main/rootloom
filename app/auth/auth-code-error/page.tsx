'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 bg-stone-50/50">
            <Card className="max-w-md w-full border-stone-200 shadow-xl overflow-hidden rounded-3xl">
                <div className="h-32 bg-deep-forest flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                        <ShieldAlert className="w-8 h-8 text-white" />
                    </div>
                </div>
                
                <CardHeader className="text-center pt-8">
                    <CardTitle className="text-2xl font-serif text-deep-forest">Authentication Error</CardTitle>
                    <CardDescription className="text-stone-500">
                        We encountered an issue while verifying your session.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4 text-center">
                    <p className="text-sm text-stone-600 leading-relaxed">
                        This usually happens if the link has expired, was already used, or if the authentication flow was interrupted.
                    </p>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-xs text-left">
                        <strong>Possible reasons:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1 opacity-80">
                            <li>The verification link or code is no longer valid.</li>
                            <li>You are clicking an old link from a previous attempt.</li>
                            <li>Your browser session changed during the process.</li>
                        </ul>
                    </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-3 pb-8">
                    <Button asChild className="w-full h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md">
                        <Link href="/auth/login">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Try Logging In Again
                        </Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full text-stone-500 hover:text-stone-900">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
