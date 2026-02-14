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
                    <li>If <strong>profile_data</strong> is null, the profile row doesn't exist.</li>
                    <li>If <strong>profile_data.role</strong> is "user", the SQL update didn't run.</li>
                    <li>If <strong>is_admin_check</strong> is false, the header won't show the link.</li>
                </ul>
            </div>
        </div>
    );
}
