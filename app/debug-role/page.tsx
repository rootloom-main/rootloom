'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function DebugRolePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function checkRole() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setData({ error: 'Not logged in' });
                setLoading(false);
                return;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            setData({
                user_email: user.email,
                user_id: user.id,
                profile_data: profile,
                profile_error: error,
                is_admin_check: profile?.role === 'admin'
            });
            setLoading(false);
        }

        checkRole();
    }, []);

    const makeAdmin = async () => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', data.user_id);

        if (error) alert('Error: ' + error.message);
        else window.location.reload();
    };

    if (loading) return <div className="p-10">Loading debug info...</div>;

    return (
        <div className="p-10 font-mono text-sm max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Role Debugger</h1>
            <pre className="bg-slate-100 p-4 rounded border">
                {JSON.stringify(data, null, 2)}
            </pre>
            <div className="mt-4 p-4 border rounded bg-yellow-50">
                <h2 className="font-bold">Interpretation:</h2>
                <ul className="list-disc ml-5 mt-2">
                    <li>If <strong>profile_data</strong> is null, the profile row doesn&apos;t exist.</li>
                    <li>If <strong>profile_data.role</strong> is &quot;user&quot;, the SQL update didn&apos;t run.</li>
                    <li>If <strong>is_admin_check</strong> is false, the header won&apos;t show the link.</li>
                </ul>
                <div className="mt-4 border-t pt-4">
                    <button
                        onClick={makeAdmin}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Force Make Me Admin (Dev Only)
                    </button>
                    <p className="text-xs text-gray-500 mt-1">This works because RLS currently allows self-update.</p>
                </div>
            </div>
        </div>
    );
}
