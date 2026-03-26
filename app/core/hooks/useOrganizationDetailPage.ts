import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { organizationAPI } from '@/app/core/api/organizations';
import {
    useOrganizationDetail,
    useOrganizationStats,
    useOrganizationUsers,
} from '@/app/core/hooks/useOrganizations';
import { globalUsersAPI } from '@/app/core/api/globalUsers';
import type { OrganizationUpdatePayload, SuspensionReason } from '@/app/core/types/organization';

export function useOrganizationDetailPage(id: number) {
    const router = useRouter();
    const { organization, loading, error, refetch, setOrganization } = useOrganizationDetail(id);
    const { stats, loading: statsLoading } = useOrganizationStats(id);
    const { users, loading: usersLoading, refetch: refetchUsers } = useOrganizationUsers(id);

    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const showSuccess = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    const handleEdit = async (data: OrganizationUpdatePayload): Promise<boolean> => {
        setSubmitting(true);
        setActionError(null);
        try {
            const updated = await organizationAPI.update(id, data);
            setOrganization(updated);
            showSuccess('Organization updated successfully');
            return true;
        } catch (err: unknown) {
            const e = err as { response?: { data?: { name?: string[] } }; message?: string };
            setActionError(e.response?.data?.name?.[0] || e.message || 'Update failed');
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuspend = async (reason: SuspensionReason): Promise<void> => {
        if (!organization) return;
        setActionError(null);
        try {
            await organizationAPI.suspend(id, reason);
            setOrganization({ ...organization, status: 'SUSPENDED', suspension_reason: reason });
            showSuccess('Organization suspended');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            setActionError(e.response?.data?.error || e.message || 'Suspend failed');
        }
    };

    const handleUnsuspend = async (): Promise<void> => {
        if (!organization) return;
        setActionError(null);
        try {
            await organizationAPI.unsuspend(id);
            setOrganization({ ...organization, status: 'ACTIVE', suspension_reason: null });
            showSuccess('Organization reactivated');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } }; message?: string };
            setActionError(e.response?.data?.error || e.message || 'Unsuspend failed');
        }
    };

    const handleDelete = async (): Promise<void> => {
        setSubmitting(true);
        setActionError(null);
        try {
            await organizationAPI.delete(id);
            router.push('/superadmin/organizations');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            setActionError(e.response?.data?.message || e.message || 'Delete failed');
            setSubmitting(false);
        }
    };

    const addExistingUser = async (userId: number, organizationId: number, role: string): Promise<void> => {
        try {
            await globalUsersAPI.addToOrg(userId, organizationId, role);
            await refetchUsers();
            showSuccess('User added successfully');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string; message?: string } } };
            throw new Error(
                e.response?.data?.detail ||
                e.response?.data?.message ||
                'Failed to add user.'
            );
        }
    };

    return {
        organization, loading, error, refetch,
        stats, statsLoading,
        users, usersLoading,
        submitting, actionError, actionSuccess,
        setActionError,
        handleEdit, handleSuspend, handleUnsuspend, handleDelete, addExistingUser,
    };
}