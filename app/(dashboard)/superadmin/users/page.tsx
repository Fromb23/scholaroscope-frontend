'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useGlobalUsers } from '@/app/core/hooks/useGlobalUsers';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
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

    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [orgFilter, setOrgFilter] = useState('all');
    const [search, setSearch] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<GlobalUser | null>(null);
    const [resetTarget, setResetTarget] = useState<GlobalUser | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<GlobalUser | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [addToOrgTarget, setAddToOrgTarget] = useState<GlobalUser | null>(null);
    const [addToOrgSubmitting, setAddToOrgSubmitting] = useState(false);
    const [membershipsTarget, setMembershipsTarget] = useState<GlobalUser | null>(null);
    const [membershipsData, setMembershipsData] = useState<UserOrgMembership[]>([]);
    const [membershipsLoading, setMembershipsLoading] = useState(false);
    const [removingOrgId, setRemovingOrgId] = useState<number | null>(null);

    const showSuccess = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    const filtered = useMemo(() => users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !search ||
            u.full_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.organization_name ?? '').toLowerCase().includes(q);
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        const matchStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && u.is_active) ||
            (statusFilter === 'inactive' && !u.is_active);
        const matchOrg = orgFilter === 'all' || String(u.organization ?? '') === orgFilter;
        return matchSearch && matchRole && matchStatus && matchOrg;
    }), [users, search, roleFilter, statusFilter, orgFilter]);

    // ── Handlers ──────────────────────────────────────────────────────────

    const withSubmit = async (fn: () => Promise<void>) => {
        setSubmitting(true);
        setActionError(null);
        try { await fn(); }
        catch (err) { setActionError(err instanceof Error ? err.message : 'An error occurred'); }
        finally { setSubmitting(false); }
    };

    const handleCreate = (data: UserCreatePayload & { organization_id?: number }) =>
        withSubmit(async () => {
            await createUser(data);
            setCreateOpen(false);
            showSuccess('User created successfully');
        });

    const handleEdit = (data: UserUpdatePayload) =>
        withSubmit(async () => {
            await updateUser(editTarget!.id, data);
            setEditTarget(null);
            showSuccess('User updated successfully');
        });

    const handleToggleActive = (user: GlobalUser) =>
        withSubmit(async () => {
            await toggleUserActive(user.id, !user.is_active);
            showSuccess(`User ${user.is_active ? 'deactivated' : 'activated'}`);
        });

    const handleResetPassword = (password: string) =>
        withSubmit(async () => {
            await resetPassword(resetTarget!.id, password);
            setResetTarget(null);
            showSuccess('Password reset successfully');
        });

    const handleAddToOrg = async (userId: number, organizationId: number, role: string) => {
        setAddToOrgSubmitting(true);
        try {
            await globalUsersAPI.addToOrg(userId, organizationId, role);
            showSuccess('User added to organization successfully');
            setAddToOrgTarget(null);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to add user.');
        } finally {
            setAddToOrgSubmitting(false);
        }
    };

    const handleViewMemberships = async (user: GlobalUser) => {
        setMembershipsTarget(user);
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
        if (!membershipsTarget) return;
        setRemovingOrgId(organizationId);
        try {
            await removeFromOrg(membershipsTarget.id, organizationId);
            // Refresh memberships list
            const updated = await getUserMemberships(membershipsTarget.id);
            setMembershipsData(updated);
            showSuccess('User removed from organization');
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to remove from organization');
        } finally {
            setRemovingOrgId(null);
        }
    };

    const handleDelete = () =>
        withSubmit(async () => {
            await deleteUser(deleteTarget!.id);
            setDeleteTarget(null);
            showSuccess('User deleted successfully');
        });

    // ── Render ─────────────────────────────────────────────────────────────

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
                <Button onClick={() => { setActionError(null); setCreateOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2">
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
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Roles</option>
                    <option value="SUPERADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="INSTRUCTOR">Instructor</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
                <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Organizations</option>
                    {organizations.map(o => (
                        <option key={o.id} value={String(o.id)}>{o.name}</option>
                    ))}
                </select>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email or organization..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
            </div>

            <UsersTable
                users={filtered}
                onEdit={u => { setActionError(null); setEditTarget(u); }}
                onReset={u => { setActionError(null); setResetTarget(u); }}
                onAddToOrg={u => setAddToOrgTarget(u)}
                onToggleActive={handleToggleActive}
                onDelete={u => { setActionError(null); setDeleteTarget(u); }}
                onViewMemberships={handleViewMemberships}
            />

            <CreateUserModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                submitting={submitting}
                organizations={organizations}
            />

            {editTarget && (
                <EditUserModal
                    isOpen={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    onSubmit={handleEdit}
                    user={editTarget}
                    submitting={submitting}
                />
            )}

            {resetTarget && (
                <ResetPasswordModal
                    isOpen={!!resetTarget}
                    onClose={() => setResetTarget(null)}
                    onSubmit={handleResetPassword}
                    userName={resetTarget.full_name}
                    submitting={submitting}
                />
            )}
            <AddToOrgModal
                isOpen={!!addToOrgTarget}
                onClose={() => setAddToOrgTarget(null)}
                onSubmit={handleAddToOrg}
                user={addToOrgTarget}
                organizations={organizations}
                submitting={addToOrgSubmitting}
            />

            <DeleteUserModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                userName={deleteTarget?.full_name ?? ''}
                submitting={submitting}
            />
            <UserMembershipsModal
                isOpen={!!membershipsTarget}
                onClose={() => { setMembershipsTarget(null); setMembershipsData([]); }}
                user={membershipsTarget}
                memberships={membershipsData}
                loading={membershipsLoading}
                onRemove={handleRemoveFromOrg}
                removing={removingOrgId}
            />
        </div>
    );
}