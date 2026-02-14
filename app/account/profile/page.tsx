import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/account/profile-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-serif font-medium text-deep-forest mb-2">
                    Profile Settings
                </h1>
                <p className="text-slate-500">
                    Manage your account details and preferences.
                </p>
            </div>

            <ProfileForm
                user={{ email: user.email || '' }}
                profile={profile || { full_name: '', phone: '' }}
            />
        </div>
    );
}
