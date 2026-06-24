'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft, Building2, Mail, Phone, Shield,
    UserCog, GraduationCap, Pencil, KeyRound,
    Power, PowerOff, Trash2, Network, AlertTriangle,
} from 'lucide-react';
import { useGlobalUserDetail } from '@/app/core/hooks/useGlobalUsers';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { useSubmitHandler } from '@/app/core/hooks/useSubmitHandler';
import { useModalState } from '@/app/core/hooks/useModalState';
import {
    EditUserModal, ResetPasswordModal,
    DeleteUserModal, AddToOrgModal,
} from '@/app/core/components/superadmin/GlobalUserComponents';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { globalUsersAPI } from '@/app/core/api/globalUsers';
import type { GlobalUser, UserOrgMembership, UserUpdatePayload } from '@/app/core/types/globalUsers';
import {
    ROLE_COLORS,
    globalStatusLabel,
    globalStatusVariant,
    membershipStatusLabel,
    membershipStatusVariant,
    resolveGlobalStatus,
} from '@/app/core/types/globalUsers';

function RoleIcon({ role }: { role: string }) {
    if (role === 'SUPERADMIN') return <Shield className="h-4 w-4 text-purple-500" />;
    if (role === 'ADMIN') return <UserCog className="h-4 w-4 text-blue-500" />;
    return <GraduationCap className="h-4 w-4 text-green-500" />;
}

export function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = Number(params.id);

    const {
        user, loading, error, refetch,
        updateUser, deleteUser, toggleUserActive,
        resetPassword, getUserMemberships, addToOrg, removeFromOrg,
    } = useGlobalUserDetail(Number.isFinite(userId) ? userId : null);
    const { organizations } = useOrganizations();

    const [memberships, setMemberships] = useState<UserOrgMembership[]>([]);
    const [membershipsLoading, setMembershipsLoading] = useState(false);
    const [membershipActionKey, setMembershipActionKey] = useState<string | null>(null);

    const { submitting, actionError, actionSuccess, setActionError, withSubmit, showSuccess } = useSubmitHandler();

    const editModal = useModalState<GlobalUser>();
    const resetModal = useModalState<GlobalUser>();
    const deleteModal = useModalState<GlobalUser>();
    const addToOrgModal = useModalState<GlobalUser>();

    useEffect(() => {
        if (!userId) return;
        setMembershipsLoading(true);
        getUserMemberships(userId)
            .then(setMemberships)
            .catch(() => setMemberships([]))
            .finally(() => setMembershipsLoading(false));
    }, [getUserMemberships, userId, user]);

    const handleEdit = (data: UserUpdatePayload) =>
        withSubmit(async () => {
            await updateUser(userId, data);
            editModal.close();
            showSuccess('User updated successfully');
        });

    const handleResetPassword = (password: string) =>
        withSubmit(async () => {
            await resetPassword(userId, password);
            resetModal.close();
            showSuccess('Password reset successfully');
        });

    const handleToggleActive = () =>
        withSubmit(async () => {
            const activate = resolveGlobalStatus(user!) !== 'ACTIVE';
            await toggleUserActive(userId, activate);
            showSuccess(activate ? 'Account globally reactivated' : 'Account globally deactivated');
        });

    const handleDelete = () =>
        withSubmit(async () => {
            await deleteUser(userId);
            router.push('/superadmin/users');
        });

    const handleAddToOrg = async (uid: number, organizationId: number, role: string) => {
        try {
            await addToOrg(uid, organizationId, role);
            showSuccess('User added to organization');
            addToOrgModal.close();
            const updated = await getUserMemberships(userId);
            setMemberships(updated);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to add user');
        }
    };

    const refreshMembershipState = async () => {
        const [updatedMemberships] = await Promise.all([
            getUserMemberships(userId),
            refetch(),
        ]);
        setMemberships(updatedMemberships);
    };

    const handleRestrictAccess = async (membership: UserOrgMembership) => {
        const actionKey = `restrict:${membership.organization.id}`;
        setMembershipActionKey(actionKey);
        try {
            await globalUsersAPI.deactivate(userId, membership.organization.id);
            await refreshMembershipState();
            showSuccess(`Access restricted for ${membership.organization.name}`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to restrict access');
        } finally {
            setMembershipActionKey(null);
        }
    };

    const handleReactivateAccess = async (membership: UserOrgMembership) => {
        const actionKey = `reactivate:${membership.organization.id}`;
        setMembershipActionKey(actionKey);
        try {
            await globalUsersAPI.activate(userId, membership.organization.id);
            await refreshMembershipState();
            showSuccess(`Access reactivated for ${membership.organization.name}`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to reactivate access');
        } finally {
            setMembershipActionKey(null);
        }
    };

    const handleRemoveFromOrg = async (membership: UserOrgMembership) => {
        const actionKey = `remove:${membership.organization.id}`;
        setMembershipActionKey(actionKey);
        try {
            await removeFromOrg(userId, membership.organization.id);
            await refreshMembershipState();
            showSuccess(`Removed from ${membership.organization.name}`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to remove from organization');
        } finally {
            setMembershipActionKey(null);
        }
    };

    const handleReaddToOrg = async (membership: UserOrgMembership) => {
        const actionKey = `readd:${membership.organization.id}`;
        setMembershipActionKey(actionKey);
        try {
            await addToOrg(userId, membership.organization.id, membership.role);
            await refreshMembershipState();
            showSuccess(`Re-added to ${membership.organization.name}`);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to re-add to organization');
        } finally {
            setMembershipActionKey(null);
        }
    };

    if (loading) return <LoadingSpinner message="Loading platform user..." />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;
    if (!user) return <ErrorState message="User not found" />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/superadmin/users')}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm"
                        onClick={() => { setActionError(null); editModal.open(user); }}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="secondary" size="sm"
                        onClick={() => { setActionError(null); resetModal.open(user); }}>
                        <KeyRound className="h-3.5 w-3.5 mr-1" /> Reset Password
                    </Button>
                    <Button variant="secondary" size="sm"
                        onClick={handleToggleActive}
                        className={resolveGlobalStatus(user) === 'ACTIVE' ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}>
                        {resolveGlobalStatus(user) === 'ACTIVE'
                            ? <><PowerOff className="h-3.5 w-3.5 mr-1" /> Globally Deactivate Account</>
                            : <><Power className="h-3.5 w-3.5 mr-1" /> Globally Reactivate Account</>
                        }
                    </Button>
                    {user.role !== 'SUPERADMIN' && (
                        <Button variant="danger" size="sm"
                            onClick={() => { setActionError(null); deleteModal.open(user); }}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Feedback */}
            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto">✕</button>
                </div>
            )}
            {actionSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    {actionSuccess}
                </div>
            )}

            {/* Profile + Memberships */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Profile card */}
                <Card className="space-y-4">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Profile</h2>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-700">{user.email}</span>
                        </div>
                        {user.phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">{user.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <RoleIcon role={user.role ?? 'INSTRUCTOR'} />
                            <Badge variant={ROLE_COLORS[(user.role ?? 'INSTRUCTOR') as keyof typeof ROLE_COLORS]}>
                                {user.role_display ?? user.role}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={globalStatusVariant(resolveGlobalStatus(user))}>
                                {globalStatusLabel(resolveGlobalStatus(user))}
                            </Badge>
                            <Badge variant={membershipStatusVariant(user.membership_status)}>
                                {membershipStatusLabel(user.membership_status)}
                            </Badge>
                        </div>
                        {user.state_message ? (
                            <p className="text-sm text-gray-500">{user.state_message}</p>
                        ) : null}
                        <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
                            <p>Joined {new Date(user.date_joined).toLocaleDateString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                            })}</p>
                            <p className="mt-1">Last login: {user.last_login
                                ? new Date(user.last_login).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })
                                : 'Never'
                            }</p>
                        </div>
                    </div>
                </Card>

                {/* Memberships */}
                <div className="xl:col-span-2">
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Network className="h-4 w-4 text-purple-500" />
                                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    Organization Memberships
                                </h2>
                            </div>
                            <Button size="sm" variant="secondary"
                                onClick={() => addToOrgModal.open(user)}>
                                <Building2 className="h-3.5 w-3.5 mr-1" /> Add to Org
                            </Button>
                        </div>

                        {membershipsLoading ? (
                            <LoadingSpinner fullScreen={false} message="Loading organization access..." />
                        ) : memberships.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No memberships found.</p>
                        ) : (
                            <div className="space-y-3">
                                {memberships.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{m.organization.name}</p>
                                                <p className="text-xs text-gray-500">{m.role_display}</p>
                                                {user.global_status === 'GLOBAL_DEACTIVATED' ? (
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Account restricted at platform level. Org membership is preserved.
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <Badge variant={m.organization.status === 'ACTIVE' ? 'success' : m.organization.status === 'PENDING' ? 'warning' : 'danger'}>
                                                {m.organization.status}
                                            </Badge>
                                            <Badge variant={membershipStatusVariant(m.status)}>
                                                {membershipStatusLabel(m.status)}
                                            </Badge>
                                            {m.status === 'ACTIVE' ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={membershipActionKey === `restrict:${m.organization.id}`}
                                                    onClick={() => void handleRestrictAccess(m)}
                                                >
                                                    {membershipActionKey === `restrict:${m.organization.id}` ? 'Saving...' : 'Restrict Access'}
                                                </Button>
                                            ) : null}
                                            {m.status === 'SUSPENDED' ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={membershipActionKey === `reactivate:${m.organization.id}`}
                                                    onClick={() => void handleReactivateAccess(m)}
                                                >
                                                    {membershipActionKey === `reactivate:${m.organization.id}` ? 'Saving...' : 'Reactivate Access'}
                                                </Button>
                                            ) : null}
                                            {m.status === 'REVOKED' ? (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={membershipActionKey === `readd:${m.organization.id}`}
                                                    onClick={() => void handleReaddToOrg(m)}
                                                >
                                                    {membershipActionKey === `readd:${m.organization.id}` ? 'Saving...' : 'Re-add to Org'}
                                                </Button>
                                            ) : null}
                                            {m.status !== 'REVOKED' ? (
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    disabled={membershipActionKey === `remove:${m.organization.id}`}
                                                    onClick={() => void handleRemoveFromOrg(m)}
                                                >
                                                    {membershipActionKey === `remove:${m.organization.id}` ? 'Removing...' : 'Remove from Organization'}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Modals */}
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
                submitting={submitting}
            />
            {deleteModal.target && (
                <DeleteUserModal
                    isOpen={deleteModal.isOpen}
                    onClose={deleteModal.close}
                    onConfirm={handleDelete}
                    userName={deleteModal.target.full_name}
                    submitting={submitting}
                />
            )}
        </div>
    );
}
