import { AccountSidebar } from '@/components/account/account-sidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    return (
        <div className="bg-stone-50/30 min-h-screen">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
                    {/* Sidebar */}
                    <AccountSidebar />

                    {/* Main Content Area */}
                    <main className="flex-1 w-full min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
