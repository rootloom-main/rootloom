'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
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

// Module-level singleton to prevent multiple GoTrue lock acquisitions.
const supabase = createClient();

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Stable ref to router — prevents the auth subscription from being torn down
    // and re-created every time the router object identity changes (happens on navigation).
    const routerRef = useRef(router);
    useEffect(() => {
        routerRef.current = router;
    }, [router]);

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
                    setLoading(false); // Unblock UI immediately
                    if (currentUser) {
                        // Run admin check in background — does not block UI
                        checkAdminStatus(currentUser);
                    }
                }
            } catch (err) {
                console.error('Error fetching session:', err);
                if (isMounted) setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                const currentUser = session?.user || null;

                // Update user state immediately so UI reacts at once
                setUser(currentUser);
                setLoading(false);

                if (currentUser) {
                    // Run admin check in background
                    checkAdminStatus(currentUser);
                } else {
                    setIsAdmin(false);
                }

                // Refresh server components for SIGNED_IN, SIGNED_OUT, and TOKEN_REFRESHED
                // so server-side session (cookies) stays in sync with client state.
                if (
                    event === 'SIGNED_IN' ||
                    event === 'SIGNED_OUT' ||
                    event === 'TOKEN_REFRESHED'
                ) {
                    // Use the stable ref so this callback never becomes stale
                    routerRef.current.refresh();
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
        // Empty dep array: we intentionally run this once.
        // routerRef is a ref — its .current is always up-to-date without being a dep.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
