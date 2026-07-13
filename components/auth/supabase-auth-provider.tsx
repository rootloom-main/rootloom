'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LoginModal } from './login-modal';

interface UserProfile {
    full_name: string | null;
    phone: string | null;
    role: string | null;
    avatar_url?: string | null;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    isAdmin: boolean;
    loading: boolean;
    refreshSession: () => Promise<void>;
    openLoginModal: (next?: string, callback?: () => void, source?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    isAdmin: false,
    loading: true,
    refreshSession: async () => {},
    openLoginModal: () => {},
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
            .select('full_name, phone, role, avatar_url')
            .eq('id', currentUser.id)
            .single();

        if (dbProfile) {
            setProfile({
                full_name: (dbProfile as any).full_name || null,
                phone: (dbProfile as any).phone || null,
                role: (dbProfile as any).role || null,
                avatar_url: (dbProfile as any).avatar_url || null,
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
                console.error('Auth: Error fetching session in initSession:', err);
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
    }, []);

    const refreshSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            const currentUser = session?.user || null;
            setUser(currentUser);
            if (currentUser) {
                await loadProfileAndAdminStatus(currentUser);
            } else {
                setProfile(null);
                setIsAdmin(false);
            }
        } catch (err) {
            console.error('Auth: Error in refreshSession:', err);
        }
    };

    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [loginRedirectUrl, setLoginRedirectUrl] = useState('/');
    const [loginSource, setLoginSource] = useState<string>('profile');
    const [loginSuccessCallback, setLoginSuccessCallback] = useState<(() => void) | null>(null);

    const openLoginModal = (next?: string, callback?: () => void, source?: string) => {
        if (next) setLoginRedirectUrl(next);
        if (callback) setLoginSuccessCallback(() => callback);
        if (source) setLoginSource(source);
        setLoginModalOpen(true);
    };

    return (
        <AuthContext.Provider value={{ user, profile, isAdmin, loading, refreshSession, openLoginModal }}>
            {children}
            <LoginModal
                isOpen={loginModalOpen}
                onOpenChange={setLoginModalOpen}
                nextUrl={loginRedirectUrl}
                source={loginSource}
                onSuccess={loginSuccessCallback || undefined}
                refreshSession={refreshSession}
            />
        </AuthContext.Provider>
    );
}
