'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useGlobalUsers } from '@/app/core/hooks/useGlobalUsers';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { useSubmitHandler } from '@/app/core/hooks/useSubmitHandler';
import { useModalState, useFlagModal } from '@/app/core/hooks/useModalState';
import { useListFilters } from '@/app/core/hooks/useListFilters';
import {
    StatsBar, UsersTable,
    CreateUserModal, EditUserModal,
    ResetPasswordModal, DeleteUserModal,
    AddToOrgModal,
    UserMembershipsModal,
} from '@/app/core/components/superadmin/GlobalUserComponents';
import type { GlobalUser, UserCreatePayload, UserOrgMembership, UserUpdatePayload } from '@/app/core/types/globalUsers';
import { globalUsersAPI } from '@/app/core/api/globalUsers';

export default function GlobalUsersPage() {
    const {
        users, loading, error, refetch,
        createUser, updateUser, deleteUser,
        toggleUserActive, resetPassword, getUserMemberships, removeFromOrg,
    } = useGlobalUsers();
    const { organizations } = useOrganizations();

    const { filters, setFilter } = useListFilters({
        role: 'all',
        status: 'all',
        org: 'all',
        search: '',
    });

    const createModal = useFlagModal();
    const editModal = useModalState<GlobalUser>();
    const resetModal = useModalState<GlobalUser>();
    const deleteModal = useModalState<GlobalUser>();
    const addToOrgModal = useModalState<GlobalUser>();
    const membershipsModal = useModalState<GlobalUser>();

    const { submitting, actionError, actionSuccess, setActionError, withSubmit, showSuccess } = useSubmitHandler();

    const [addToOrgSubmitting, setAddToOrgSubmitting] = useState(false);
    const [membershipsData, setMembershipsData] = useState<UserOrgMembership[]>([]);
    const [membershipsLoading, setMembershipsLoading] = useState(false);
    const [removingOrgId, setRemovingOrgId] = useState<number | null>(null);

    const filtered = useMemo(() => users.filter(u => {
        const q = filters.search.toLowerCase();
        const matchSearch = !filters.search ||
            u.full_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.organization_name ?? '').toLowerCase().includes(q);
        const matchRole = filters.role === 'all' || u.role === filters.role;
        const matchStatus = filters.status === 'all' ||
            (filters.status === 'active' && u.is_active) ||
            (filters.status === 'inactive' && !u.is_active);
        const matchOrg = filters.org === 'all' || String(u.organization ?? '') === filters.org;
        return matchSearch && matchRole && matchStatus && matchOrg;
    }), [users, filters]);

    const handleCreate = (data: UserCreatePayload & { organization_id?: number }) =>
        withSubmit(async () => {
            await createUser(data);
            createModal.close();
            showSuccess('User created successfully');
        });

    const handleEdit = (data: UserUpdatePayload) =>
        withSubmit(async () => {
            await updateUser(editModal.target!.id, data);
            editModal.close();
            showSuccess('User updated successfully');
        });

    const handleToggleActive = (user: GlobalUser) =>
        withSubmit(async () => {
            await toggleUserActive(user.id, !user.is_active);
            showSuccess(`User ${user.is_active ? 'deactivated' : 'activated'}`);
        });

    const handleResetPassword = (password: string) =>
        withSubmit(async () => {
            await resetPassword(resetModal.target!.id, password);
            resetModal.close();
            showSuccess('Password reset successfully');
        });

    const handleAddToOrg = async (userId: number, organizationId: number, role: string) => {
        setAddToOrgSubmitting(true);
        try {
            await globalUsersAPI.addToOrg(userId, organizationId, role);
            showSuccess('User added to organization successfully');
            addToOrgModal.close();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to add user.');
        } finally {
            setAddToOrgSubmitting(false);
        }
    };

    const handleViewMemberships = async (user: GlobalUser) => {
        membershipsModal.open(user);
        setMembershipsLoading(true);
        try {
            const data = await getUserMemberships(user.id);
            setMembershipsData(data);
        } catch {
            setMembershipsData([]);
        } finally {
            setMembershipsLoading(false);
        }
    };

    const handleRemoveFromOrg = async (organizationId: number) => {
        if (!membershipsModal.target) return;
        setRemovingOrgId(organizationId);
        try {
            await removeFromOrg(membershipsModal.target.id, organizationId);
            const updated = await getUserMemberships(membershipsModal.target.id);
            setMembershipsData(updated);
            showSuccess('User removed from organization');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to remove from organization');
        } finally {
            setRemovingOrgId(null);
        }
    };

    const handleDelete = () =>
        withSubmit(async () => {
            await deleteUser(deleteModal.target!.id);
            deleteModal.close();
            showSuccess('User deleted successfully');
        });

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Global Users</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage users across all organizations — {users.length} total
                    </p>
                </div>
                <Button
                    onClick={() => { setActionError(null); createModal.open(); }}
                    className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2"
                >
                    <Plus className="h-4 w-4" />New User
                </Button>
            </div>

            <StatsBar users={users} />

            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}
            {actionSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />{actionSuccess}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <select value={filters.role} onChange={e => setFilter('role', e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Roles</option>
                    <option value="SUPERADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="INSTRUCTOR">Instructor</option>
                </select>
                <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <select value={filters.org} onChange={e => setFilter('org', e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Organizations</option>
                    {organizations.map(o => (
                        <option key={o.id} value={String(o.id)}>{o.name}</option>
                    ))}
                </select>
                <input
                    value={filters.search}
                    onChange={e => setFilter('search', e.target.value)}
                    placeholder="Search by name, email or organization..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <UsersTable
                users={filtered}
                onEdit={u => { setActionError(null); editModal.open(u); }}
                onReset={u => { setActionError(null); resetModal.open(u); }}
                onAddToOrg={u => addToOrgModal.open(u)}
                onToggleActive={handleToggleActive}
                onDelete={u => { setActionError(null); deleteModal.open(u); }}
                onViewMemberships={handleViewMemberships}
            />

            <CreateUserModal
                isOpen={createModal.isOpen}
                onClose={createModal.close}
                onSubmit={handleCreate}
                submitting={submitting}
                organizations={organizations}
            />

            {editModal.target && (
                <EditUserModal
                    isOpen={editModal.isOpen}
                    onClose={editModal.close}
                    onSubmit={handleEdit}
                    user={editModal.target}
                    submitting={submitting}
                />
            )}

            {resetModal.target && (
                <ResetPasswordModal
                    isOpen={resetModal.isOpen}
                    onClose={resetModal.close}
                    onSubmit={handleResetPassword}
                    userName={resetModal.target.full_name}
                    submitting={submitting}
                />
            )}

            <AddToOrgModal
                isOpen={addToOrgModal.isOpen}
                onClose={addToOrgModal.close}
                onSubmit={handleAddToOrg}
                user={addToOrgModal.target}
                organizations={organizations}
                submitting={addToOrgSubmitting}
            />

            <DeleteUserModal
                isOpen={deleteModal.isOpen}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                userName={deleteModal.target?.full_name ?? ''}
                submitting={submitting}
            />

            <UserMembershipsModal
                isOpen={membershipsModal.isOpen}
                onClose={() => { membershipsModal.close(); setMembershipsData([]); }}
                user={membershipsModal.target}
                memberships={membershipsData}
                loading={membershipsLoading}
                onRemove={handleRemoveFromOrg}
                removing={removingOrgId}
            />
        </div>
    );
}