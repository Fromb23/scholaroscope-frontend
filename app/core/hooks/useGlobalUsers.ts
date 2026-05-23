// ============================================================================
// app/hooks/useGlobalUsers.ts
// ============================================================================

import { useCallback, useState, useEffect } from 'react';
import { globalUsersAPI } from '@/app/core/api/globalUsers';
import {
    GlobalUserActionResponse,
    GlobalUser,
    UserCreatePayload,
    UserUpdatePayload,
    GlobalUserStats,
    UserOrgMembership,
} from '@/app/core/types/globalUsers';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

function resolveActionUser(
    response: GlobalUserActionResponse,
    fallback: GlobalUser | undefined,
): GlobalUser {
    if (response.user) {
        return response.user;
    }

    if (!fallback) {
        throw new Error(response.detail || response.message || 'User state was not returned.');
    }

    return {
        ...fallback,
        membership_status: response.membership_status ?? fallback.membership_status ?? null,
    };
}

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
            setUsers(prev => prev.map((u) => (
                u.id === id
                    ? resolveActionUser(updated, u)
                    : u
            )));
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

    const getUserMemberships = useCallback(async (id: number): Promise<UserOrgMembership[]> => {
        return await globalUsersAPI.getMemberships(id);
    }, []);

    const removeFromOrg = async (userId: number, organizationId: number): Promise<void> => {
        try {
            await globalUsersAPI.removeFromOrg(userId, organizationId);
            await fetchUsers();
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

export const useGlobalUserDetail = (userId: number | null) => {
    const [user, setUser] = useState<GlobalUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = useCallback(async () => {
        if (!userId) {
            setUser(null);
            setLoading(false);
            setError('User not found');
            return null;
        }

        try {
            setLoading(true);
            const data = await globalUsersAPI.getById(userId);
            setUser(data);
            setError(null);
            return data;
        } catch (err) {
            setUser(null);
            setError(extractErrorMessage(err as ApiError, 'Failed to fetch user'));
            return null;
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void fetchUser();
    }, [fetchUser]);

    const updateUser = async (id: number, data: UserUpdatePayload) => {
        try {
            const updated = await globalUsersAPI.update(id, data);
            await fetchUser();
            return updated;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to update user'));
        }
    };

    const deleteUser = async (id: number) => {
        try {
            await globalUsersAPI.delete(id);
            setUser(null);
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete user'));
        }
    };

    const toggleUserActive = async (id: number, activate: boolean) => {
        try {
            const updated = activate
                ? await globalUsersAPI.activate(id)
                : await globalUsersAPI.deactivate(id);
            await fetchUser();
            return updated;
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to change user status'));
        }
    };

    const resetPassword = async (id: number, new_password: string) => {
        try {
            await globalUsersAPI.resetPassword(id, new_password);
            await fetchUser();
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to reset password'));
        }
    };

    const getUserMemberships = useCallback(async (id: number): Promise<UserOrgMembership[]> => {
        return await globalUsersAPI.getMemberships(id);
    }, []);

    const addToOrg = async (id: number, organizationId: number, role: string): Promise<void> => {
        try {
            await globalUsersAPI.addToOrg(id, organizationId, role);
            await fetchUser();
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to add user to organization'));
        }
    };

    const removeFromOrg = async (id: number, organizationId: number): Promise<void> => {
        try {
            await globalUsersAPI.removeFromOrg(id, organizationId);
            await fetchUser();
        } catch (err) {
            throw new Error(extractErrorMessage(err as ApiError, 'Failed to remove from organization'));
        }
    };

    return {
        user,
        loading,
        error,
        refetch: fetchUser,
        updateUser,
        deleteUser,
        toggleUserActive,
        resetPassword,
        getUserMemberships,
        addToOrg,
        removeFromOrg,
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
