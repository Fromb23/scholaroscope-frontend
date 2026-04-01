// ============================================================================
// app/hooks/useGlobalUsers.ts
// ============================================================================

import { useState, useEffect } from 'react';
import { globalUsersAPI } from '@/app/core/api/globalUsers';
import {
    GlobalUser,
    UserCreatePayload,
    UserUpdatePayload,
    GlobalUserStats,
    UserOrgMembership,
} from '@/app/core/types/globalUsers';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

// ---------------------------------------------------------------------------
// useGlobalUsers
// ---------------------------------------------------------------------------
export const useGlobalUsers = () => {
    const [users, setUsers] = useState<GlobalUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await globalUsersAPI.getAll();
            setUsers(Array.isArray(data) ? data : (data as { results?: GlobalUser[] }).results ?? []);
            setError(null);
        } catch (err) {
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch users'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const createUser = async (data: UserCreatePayload & { organization_id?: number }) => {
        try {
            const newUser = await globalUsersAPI.create(data);
            setUsers(prev => [newUser, ...prev]);
            return newUser;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to create user'));
        }
    };

    const updateUser = async (id: number, data: UserUpdatePayload) => {
        try {
            const updated = await globalUsersAPI.update(id, data);
            setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
            return updated;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to update user'));
        }
    };

    const deleteUser = async (id: number) => {
        try {
            await globalUsersAPI.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete user'));
        }
    };

    const toggleUserActive = async (id: number, activate: boolean) => {
        try {
            const updated = activate
                ? await globalUsersAPI.activate(id)
                : await globalUsersAPI.deactivate(id);
            setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
            return updated;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to change user status'));
        }
    };

    const resetPassword = async (id: number, new_password: string) => {
        try {
            await globalUsersAPI.resetPassword(id, new_password);
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to reset password'));
        }
    };

    const getUserMemberships = async (id: number): Promise<UserOrgMembership[]> => {
        return await globalUsersAPI.getMemberships(id);
    };

    const removeFromOrg = async (userId: number, organizationId: number): Promise<void> => {
        try {
            await globalUsersAPI.removeFromOrg(userId, organizationId);
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to remove from organization'));
        }
    };

    return {
        users, loading, error, refetch: fetchUsers,
        createUser, updateUser, deleteUser,
        toggleUserActive, resetPassword,
        getUserMemberships, removeFromOrg,
    };
};

// ---------------------------------------------------------------------------
// useGlobalUserStats
// ---------------------------------------------------------------------------
export const useGlobalUserStats = () => {
    const [stats, setStats] = useState<GlobalUserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const data = await globalUsersAPI.getStatistics();
                setStats(data);
                setError(null);
            } catch (err) {
                setError(extractErrorMessage(err as ApiError, 'Failed to fetch statistics'));
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    return { stats, loading, error };
};