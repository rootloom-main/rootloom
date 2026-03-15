'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

// Module-level singleton to prevent multiple lock acquisitions.
const supabase = createClient();

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkAdminStatus = async (currentUser: User | null) => {
        if (!currentUser) {
            setIsAdmin(false);
            return;
        }

        // 1. Check user_metadata first (fastest, no network call)
        const metadataRole = currentUser.user_metadata?.role;
        if (metadataRole === 'admin' || metadataRole === 'superadmin') {
            setIsAdmin(true);
            return;
        }

        // 2. Fallback to profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

        const dbRole = profile?.role;
        setIsAdmin(dbRole === 'admin' || dbRole === 'superadmin');
    };

    useEffect(() => {
        let isMounted = true;

        // Fetch initial session on mount
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    const currentUser = session?.user || null;
                    setUser(currentUser);
                    if (currentUser) {
                        await checkAdminStatus(currentUser);
                    }
                }
            } catch (err) {
                console.error('Error fetching session:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                const currentUser = session?.user || null;
                setUser(currentUser);
                
                if (currentUser) {
                    await checkAdminStatus(currentUser);
                } else {
                    setIsAdmin(false);
                }

                setLoading(false);

                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    router.refresh();
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
