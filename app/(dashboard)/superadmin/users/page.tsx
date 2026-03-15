'use client';

// ============================================================================
// app/(dashboard)/superadmin/users/page.tsx
// ============================================================================

import { useState, useMemo } from 'react';
import {
    Plus, Shield, UserCog, GraduationCap,
    Pencil, Trash2, Power, PowerOff, KeyRound, AlertTriangle,
    CheckCircle, Building2, Mail, Phone,
} from 'lucide-react';
import { useGlobalUsers } from '@/app/core/hooks/useGlobalUsers';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import {
    GlobalUser, UserCreatePayload, UserUpdatePayload,
    ROLE_COLORS,
} from '@/app/core/types/globalUsers';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';

// ============================================================================
// Role Icon helper
// ============================================================================
function RoleIcon({ role }: { role: string }) {
    if (role === 'SUPERADMIN') return <Shield className="h-3.5 w-3.5 text-purple-500" />;
    if (role === 'ADMIN') return <UserCog className="h-3.5 w-3.5 text-blue-500" />;
    return <GraduationCap className="h-3.5 w-3.5 text-green-500" />;
}

// ============================================================================
// Stats Bar
// ============================================================================
function StatsBar({ users }: { users: GlobalUser[] }) {
    const superadmins = users.filter(u => u.role === 'SUPERADMIN').length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    const instructors = users.filter(u => u.role === 'INSTRUCTOR').length;
    const inactive = users.filter(u => !u.is_active).length;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
                { label: 'Super Admins', value: superadmins, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Admins', value: admins, icon: UserCog, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Instructors', value: instructors, icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Inactive', value: inactive, icon: PowerOff, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
                <Card key={s.label} className="py-4 px-5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 ${s.bg} rounded-lg`}>
                            <s.icon className={`h-4 w-4 ${s.color}`} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

// ============================================================================
// Create User Modal
// ============================================================================
interface CreateFormData {
    email: string; first_name: string; last_name: string;
    role: string; organization: string; phone: string;
    password: string; password2: string;
}
const EMPTY_CREATE: CreateFormData = {
    email: '', first_name: '', last_name: '',
    role: 'INSTRUCTOR', organization: '', phone: '',
    password: '', password2: '',
};

function CreateUserModal({
    isOpen, onClose, onSubmit, submitting, organizations,
}: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (data: UserCreatePayload) => Promise<void>;
    submitting: boolean;
    organizations: { id: number; name: string }[];
}) {
    const [form, setForm] = useState<CreateFormData>(EMPTY_CREATE);
    const [errors, setErrors] = useState<Partial<CreateFormData>>({});

    const set = (field: keyof CreateFormData, val: string) => {
        setForm(p => ({ ...p, [field]: val }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
    };

    const validate = () => {
        const e: Partial<CreateFormData> = {};
        if (!form.email.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
        if (!form.first_name.trim()) e.first_name = 'First name is required';
        if (!form.last_name.trim()) e.last_name = 'Last name is required';
        if (!form.organization) e.organization = 'Organization is required';
        if (!form.password) e.password = 'Password is required';
        else if (form.password.length < 8) e.password = 'Min 8 characters';
        if (form.password !== form.password2) e.password2 = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        await onSubmit({
            email: form.email,
            first_name: form.first_name,
            last_name: form.last_name,
            role: form.role as 'ADMIN' | 'INSTRUCTOR',
            phone: form.phone || undefined,
            password: form.password,
            password2: form.password2,
        });
        setForm(EMPTY_CREATE);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create User" size="lg">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name *" value={form.first_name}
                        onChange={e => set('first_name', e.target.value)} error={errors.first_name} />
                    <Input label="Last Name *" value={form.last_name}
                        onChange={e => set('last_name', e.target.value)} error={errors.last_name} />
                </div>
                <Input label="Email *" type="email" value={form.email}
                    onChange={e => set('email', e.target.value)} error={errors.email} />
                <Input label="Phone" value={form.phone}
                    onChange={e => set('phone', e.target.value)} placeholder="+254 700 000 000" />
                <div className="grid grid-cols-2 gap-4">
                    <Select label="Role *" value={form.role} onChange={e => set('role', e.target.value)}
                        options={[
                            { value: 'INSTRUCTOR', label: 'Instructor' },
                            { value: 'ADMIN', label: 'Admin' },
                        ]} />
                    <Select label="Organization *" value={form.organization}
                        onChange={e => set('organization', e.target.value)}
                        error={errors.organization}
                        options={[
                            { value: '', label: 'Select organization...' },
                            ...organizations.map(o => ({ value: String(o.id), label: o.name })),
                        ]} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Password *" type="password" value={form.password}
                        onChange={e => set('password', e.target.value)} error={errors.password} />
                    <Input label="Confirm Password *" type="password" value={form.password2}
                        onChange={e => set('password2', e.target.value)} error={errors.password2} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                        {submitting ? 'Creating...' : 'Create User'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Edit User Modal
// ============================================================================
function EditUserModal({
    isOpen, onClose, onSubmit, user, submitting,
}: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (data: UserUpdatePayload) => Promise<void>;
    user: GlobalUser; submitting: boolean;
}) {
    const [form, setForm] = useState({
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="md">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" value={form.first_name}
                        onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                    <Input label="Last Name" value={form.last_name}
                        onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
                <Input label="Phone" value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={() => onSubmit(form)} disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Reset Password Modal
// ============================================================================
function ResetPasswordModal({
    isOpen, onClose, onSubmit, userName, submitting,
}: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (password: string) => Promise<void>;
    userName: string; submitting: boolean;
}) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [err, setErr] = useState('');

    const handleSubmit = async () => {
        if (password.length < 8) { setErr('Min 8 characters'); return; }
        if (password !== confirm) { setErr('Passwords do not match'); return; }
        setErr('');
        await onSubmit(password);
        setPassword(''); setConfirm('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reset Password — ${userName}`} size="sm">
            <div className="space-y-4">
                <Input label="New Password" type="password" value={password}
                    onChange={e => { setPassword(e.target.value); setErr(''); }} />
                <Input label="Confirm Password" type="password" value={confirm}
                    onChange={e => { setConfirm(e.target.value); setErr(''); }} error={err} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                        {submitting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Delete Confirm Modal
// ============================================================================
function DeleteUserModal({
    isOpen, onClose, onConfirm, userName, submitting,
}: {
    isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void>;
    userName: string; submitting: boolean;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete User" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                        Permanently delete <strong>{userName}</strong>? This cannot be undone.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete User'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Main Page
// ============================================================================
export default function GlobalUsersPage() {
    const {
        users, loading, error, refetch,
        createUser, updateUser, deleteUser, toggleUserActive, resetPassword,
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

    const showSuccess = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    // Client-side filtering (search handled by DataTable internally via onSearch)
    const filtered = useMemo(() => {
        return users.filter(u => {
            const matchSearch = !search ||
                u.full_name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase()) ||
                (u.organization_name ?? '').toLowerCase().includes(search.toLowerCase());
            const matchRole = roleFilter === 'all' || u.role === roleFilter;
            const matchStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && u.is_active) ||
                (statusFilter === 'inactive' && !u.is_active);
            const matchOrg = orgFilter === 'all' || String(u.organization) === orgFilter;
            return matchSearch && matchRole && matchStatus && matchOrg;
        });
    }, [users, search, roleFilter, statusFilter, orgFilter]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleCreate = async (data: UserCreatePayload) => {
        setSubmitting(true); setActionError(null);
        try {
            await createUser(data);
            setCreateOpen(false);
            showSuccess('User created successfully');
        } catch (err: unknown) { 
            if (err instanceof Error) {
                setActionError(err.message);
            } else {
                setActionError('An unknown error occurred while creating the user.');
            }
        }
        finally { setSubmitting(false); }
    };

    const handleEdit = async (data: UserUpdatePayload) => {
        if (!editTarget) return;
        setSubmitting(true); setActionError(null);
        try {
            await updateUser(editTarget.id, data);
            setEditTarget(null);
            showSuccess('User updated successfully');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setActionError(err.message);
            } else {
                setActionError('An unknown error occurred while updating the user.');
            }
        }
        finally { setSubmitting(false); }
    };

    const handleToggleActive = async (user: GlobalUser) => {
        setActionError(null);
        try {
            await toggleUserActive(user.id, !user.is_active);
            showSuccess(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setActionError(err.message);
            } else {
                setActionError('An unknown error occurred while toggling user active status.');
            }
        }
        finally { setSubmitting(false); }
    };

    const handleResetPassword = async (password: string) => {
        if (!resetTarget) return;
        setSubmitting(true); setActionError(null);
        try {
            await resetPassword(resetTarget.id, password);
            setResetTarget(null);
            showSuccess('Password reset successfully');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setActionError(err.message);
            } else {
                setActionError('An unknown error occurred while resetting the password.');
            }
        }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true); setActionError(null);
        try {
            await deleteUser(deleteTarget.id);
            setDeleteTarget(null);
            showSuccess('User deleted successfully');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setActionError(err.message);
            } else {
                setActionError('An unknown error occurred while deleting the user.');
            }
        }
        finally { setSubmitting(false); }
    };

    // ── DataTable columns ─────────────────────────────────────────────────────

    const columns: Column<GlobalUser>[] = [
        {
            key: 'full_name',
            header: 'User',
            sortable: true,
            render: (row) => (
                <div>
                    <p className="text-sm font-semibold text-gray-900">{row.full_name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />{row.email}
                    </p>
                    {row.phone && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />{row.phone}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            sortable: true,
            filterable: true,
            filterOptions: [
                { label: 'Super Admin', value: 'SUPERADMIN' },
                { label: 'Admin', value: 'ADMIN' },
                { label: 'Instructor', value: 'INSTRUCTOR' },
            ],
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <RoleIcon role={row.role} />
                    <Badge variant={ROLE_COLORS[row.role]} size="sm">
                        {row.role_display}
                    </Badge>
                </div>
            ),
        },
        {
            key: 'organization_name',
            header: 'Organization',
            sortable: true,
            render: (row) => row.organization_name ? (
                <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    <div>
                        <p className="text-sm text-gray-700">{row.organization_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{row.organization_code}</p>
                    </div>
                </div>
            ) : (
                <span className="text-xs text-gray-400 italic">Platform level</span>
            ),
        },
        {
            key: 'is_active',
            header: 'Status',
            filterable: true,
            filterOptions: [
                { label: 'Active', value: 'true' },
                { label: 'Inactive', value: 'false' },
            ],
            render: (row) => (
                <Badge variant={row.is_active ? 'success' : 'danger'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
        {
            key: 'last_login',
            header: 'Last Login',
            sortable: true,
            render: (row) => row.last_login
                ? new Date(row.last_login).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : <span className="text-gray-300 italic text-xs">Never</span>,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => { setActionError(null); setEditTarget(row); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit user">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => { setActionError(null); setResetTarget(row); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                        title="Reset password">
                        <KeyRound className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleToggleActive(row)}
                        className={`p-1.5 rounded-lg transition-colors ${row.is_active
                            ? 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'
                            : 'text-gray-500 hover:bg-green-50 hover:text-green-600'}`}
                        title={row.is_active ? 'Deactivate' : 'Activate'}>
                        {row.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    {row.role !== 'SUPERADMIN' && (
                        <button onClick={() => { setActionError(null); setDeleteTarget(row); }}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Delete user">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    // ── Loading / error ────────────────────────────────────────────────────────

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
                <p className="mt-3 text-sm text-gray-500">Loading users...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="secondary" onClick={refetch} className="mt-3">Try Again</Button>
            </div>
        </div>
    );

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Global Users</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage users across all organizations — {users.length} total
                    </p>
                </div>
                <Button variant="primary" onClick={() => { setActionError(null); setCreateOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2">
                    <Plus className="h-4 w-4" />New User
                </Button>
            </div>

            {/* Stats */}
            <StatsBar users={users} />

            {/* Feedback */}
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

            {/* External filters (role, status, org) — DataTable handles search internally */}
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
            </div>

            {/* DataTable */}
            <DataTable<GlobalUser & Record<string, unknown>>
                data={filtered.map(i => i as GlobalUser & Record<string, unknown>)}
                columns={columns}
                loading={false}
                enableSearch
                enableSort
                enableFilter
                searchPlaceholder="Search by name, email or organization..."
                emptyMessage={
                    roleFilter !== 'all' || statusFilter !== 'all' || orgFilter !== 'all'
                        ? 'No users match your filters'
                        : 'No users yet'
                }
                onSearch={setSearch}
                onSort={() => {
                    // Client-side sort on filtered list if needed
                }}
            />

            {/* Modals */}
            <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate} submitting={submitting} organizations={organizations} />

            {editTarget && (
                <EditUserModal isOpen={!!editTarget} onClose={() => setEditTarget(null)}
                    onSubmit={handleEdit} user={editTarget} submitting={submitting} />
            )}

            {resetTarget && (
                <ResetPasswordModal isOpen={!!resetTarget} onClose={() => setResetTarget(null)}
                    onSubmit={handleResetPassword} userName={resetTarget.full_name} submitting={submitting} />
            )}

            <DeleteUserModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete} userName={deleteTarget?.full_name ?? ''} submitting={submitting} />
        </div>
    );
}