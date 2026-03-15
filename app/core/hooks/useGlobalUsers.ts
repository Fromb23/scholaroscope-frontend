// ============================================================================
// app/hooks/useGlobalUsers.ts
// Mirrors the exact hook pattern used across the codebase
// ============================================================================

import { useState, useEffect } from 'react';
import { globalUsersAPI } from '@/app/core/api/globalUsers';
import {
    GlobalUser,
    UserCreatePayload,
    UserUpdatePayload,
    GlobalUserStats,
} from '@/app/core/types/globalUsers';

// ---------------------------------------------------------------------------
// useGlobalUsers — list, create, update, delete, activate/deactivate
// ---------------------------------------------------------------------------
export const useGlobalUsers = () => {
    const [users, setUsers] = useState<GlobalUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await globalUsersAPI.getAll();
            const usersArray = Array.isArray(data) ? data : (data as any).results ?? [];
            setUsers(usersArray);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const createUser = async (data: UserCreatePayload) => {
        try {
            const newUser = await globalUsersAPI.create(data);
            setUsers(prev => [newUser, ...prev]);
            return newUser;
        } catch (err: any) {
            const msg =
                err.response?.data?.email?.[0] ||
                err.response?.data?.password?.[0] ||
                err.response?.data?.message ||
                'Failed to create user';
            throw new Error(msg);
        }
    };

    const updateUser = async (id: number, data: UserUpdatePayload) => {
        try {
            const updated = await globalUsersAPI.update(id, data);
            setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
            return updated;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to update user');
        }
    };

    const deleteUser = async (id: number) => {
        try {
            await globalUsersAPI.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const toggleUserActive = async (id: number, activate: boolean) => {
        try {
            const updated = activate
                ? await globalUsersAPI.activate(id)
                : await globalUsersAPI.deactivate(id);
            setUsers(prev => prev.map(u => (u.id === id ? updated.user ?? updated : u)));
            return updated;
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to change user status');
        }
    };

    const resetPassword = async (id: number, new_password: string) => {
        try {
            await globalUsersAPI.resetPassword(id, new_password);
        } catch (err: any) {
            throw new Error(err.response?.data?.message || 'Failed to reset password');
        }
    };

    return {
        users,
        loading,
        error,
        refetch: fetchUsers,
        createUser,
        updateUser,
        deleteUser,
        toggleUserActive,
        resetPassword,
    };
};

// ---------------------------------------------------------------------------
// useGlobalUserStats — platform-wide user statistics
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
            } catch (err: any) {
                setError(err.message || 'Failed to fetch statistics');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    return { stats, loading, error };
};