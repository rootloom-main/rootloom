'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface UserProfile {
    full_name: string | null;
    phone: string | null;
    role: string | null;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    isAdmin: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    isAdmin: false,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

// Module-level singleton to prevent multiple GoTrue lock acquisitions.
const supabase = createClient();

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Stable ref to router
    const routerRef = useRef(router);
    useEffect(() => {
        routerRef.current = router;
    }, [router]);

    const loadProfileAndAdminStatus = async (currentUser: User | null) => {
        if (!currentUser) {
            setProfile(null);
            setIsAdmin(false);
            return;
        }

        // Fetch the user's profile from DB (gets full_name, phone, avatar, role)
        const { data: dbProfile } = await supabase
            .from('profiles')
            .select('full_name, phone, role')
            .eq('id', currentUser.id)
            .single();

        if (dbProfile) {
            setProfile({
                full_name: (dbProfile as any).full_name || null,
                phone: (dbProfile as any).phone || null,
                role: (dbProfile as any).role || null,
            });
            const dbRole = (dbProfile as any).role;
            setIsAdmin(dbRole === 'admin' || dbRole === 'superadmin');
        } else {
            // Fallback to user_metadata if profile row doesn't exist yet
            const metaRole = currentUser.user_metadata?.role;
            setIsAdmin(metaRole === 'admin' || metaRole === 'superadmin');
            setProfile(null);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    const currentUser = session?.user || null;
                    setUser(currentUser);
                    setLoading(false);
                    if (currentUser) {
                        loadProfileAndAdminStatus(currentUser);
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
                setUser(currentUser);
                setLoading(false);

                if (currentUser) {
                    loadProfileAndAdminStatus(currentUser);
                } else {
                    setProfile(null);
                    setIsAdmin(false);
                }

                if (
                    event === 'SIGNED_IN' ||
                    event === 'SIGNED_OUT' ||
                    event === 'TOKEN_REFRESHED'
                ) {
                    routerRef.current.refresh();
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
