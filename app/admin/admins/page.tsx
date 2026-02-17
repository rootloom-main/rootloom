'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Shield, ShieldAlert, ShieldCheck, Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: 'user' | 'admin' | 'superadmin';
    created_at: string;
}

export default function AdminManagementPage() {
    const supabase = createClient();
    const router = useRouter();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            // Check current user role first
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth/login');
                return;
            }

            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (currentProfile?.role !== 'superadmin') {
                toast.error('Unauthorized access');
                router.push('/admin');
                return;
            }
            setCurrentUserRole(currentProfile.role);

            // Fetch all profiles
            let query = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (searchTerm) {
                // Simple search by email or name
                query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            setProfiles(data || []);

        } catch (error) {
            console.error('Error fetching profiles:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [supabase, router, searchTerm]);

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchProfiles();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchProfiles]);


    const handleUpdateRole = async (userId: string, newRole: 'user' | 'admin') => {
        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            toast.success(`User role updated to ${newRole}`);
            setSelectedUser(null);
            fetchProfiles(); // Refresh list
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error('Failed to update role');
        } finally {
            setActionLoading(false);
        }
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'superadmin': return 'destructive'; // Red
            case 'admin': return 'default'; // Black/Dark
            default: return 'secondary'; // Gray
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'superadmin': return <ShieldAlert className="h-4 w-4 mr-1 text-red-500" />;
            case 'admin': return <ShieldCheck className="h-4 w-4 mr-1 text-blue-500" />;
            default: return <Shield className="h-4 w-4 mr-1 text-gray-400" />;
        }
    };

    if (loading && profiles.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Management</h1>
                    <p className="text-gray-500">Manage user roles and permissions.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search users..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Current Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile) => (
                            <TableRow key={profile.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{profile.full_name || 'No Name'}</span>
                                        <span className="text-xs text-muted-foreground">{profile.email}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">{profile.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        {getRoleIcon(profile.role)}
                                        <Badge variant={getRoleBadgeVariant(profile.role)} className="capitalize">
                                            {profile.role}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    {profile.role === 'superadmin' ? (
                                        <span className="text-xs text-muted-foreground italic">Immutable</span>
                                    ) : (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedUser(profile)}
                                                >
                                                    Manage Role
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Change Role for {profile.email}</DialogTitle>
                                                    <DialogDescription>
                                                        Are you sure you want to change this user&apos;s permissions?
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="flex flex-col gap-3 py-4">
                                                    {profile.role !== 'admin' && (
                                                        <Button
                                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                            onClick={() => handleUpdateRole(profile.id, 'admin')}
                                                            disabled={actionLoading}
                                                        >
                                                            <ShieldCheck className="h-4 w-4 mr-2" />
                                                            Promote to Admin
                                                        </Button>
                                                    )}
                                                    {profile.role !== 'user' && (
                                                        <Button
                                                            variant="destructive"
                                                            className="w-full"
                                                            onClick={() => handleUpdateRole(profile.id, 'user')}
                                                            disabled={actionLoading}
                                                        >
                                                            <Shield className="h-4 w-4 mr-2" />
                                                            Demote to User
                                                        </Button>
                                                    )}
                                                </div>
                                                <DialogFooter>
                                                    <p className="text-xs text-muted-foreground text-center w-full">
                                                        Admins have full access to the dashboard. Users have no access.
                                                    </p>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4 text-xs text-gray-500 text-center">
                Only showing top 50 users. Use search to find specific users.
            </div>
        </div>
    );
}
