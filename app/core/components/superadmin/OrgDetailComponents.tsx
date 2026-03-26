// app/core/components/superadmin/OrgDetailComponents.tsx
'use client';

import { useEffect, useState } from 'react';
import {
    ShieldCheck, GraduationCap,
    Mail, Phone, MapPin, Hash, Globe, Calendar,
    Users,
    Plus,
    AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import type { Organization, OrgUser, OrganizationStats, PlanType, SuspensionReason } from '@/app/core/types/organization';
import { PLAN_LABELS as PlanLabels, PLAN_COLORS as PlanColors, SUSPENSION_REASON_LABELS } from '@/app/core/types/organization';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { GlobalUser } from '../../types/globalUsers';

// ── Tab types ────────────────────────────────────────────────────────────────

export type TabId = 'overview' | 'curricula' | 'years' | 'terms' | 'subjects' | 'cohorts' | 'users';

// ── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
}

export function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
    return (
        <div className={`flex items-center gap-4 p-5 rounded-xl border ${color}`}>
            <div className="p-2.5 rounded-lg bg-white/60">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm font-medium opacity-80">{label}</p>
            </div>
        </div>
    );
}

// ── OrgStats ─────────────────────────────────────────────────────────────────

interface OrgStatsProps {
    stats: OrganizationStats;
}

export function OrgStats({ stats }: OrgStatsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.total_members} icon={Users}
                color="bg-blue-50 border-blue-200 text-blue-800" />
            <StatCard label="Active Users" value={stats.active_members} icon={ShieldCheck}
                color="bg-green-50 border-green-200 text-green-800" />
            <StatCard label="Admins" value={stats.by_role.ADMIN} icon={ShieldCheck}
                color="bg-purple-50 border-purple-200 text-purple-800" />
            <StatCard label="Instructors" value={stats.by_role.INSTRUCTOR} icon={GraduationCap}
                color="bg-orange-50 border-orange-200 text-orange-800" />
        </div>
    );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

interface InfoRowProps {
    icon: React.ElementType;
    label: string;
    value: string;
}

export function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
            <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
                <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
            </div>
        </div>
    );
}

// ── OrgOverviewTab ────────────────────────────────────────────────────────────

interface OrgOverviewTabProps {
    organization: Organization;
    onChangePlan: () => void;
}

export function OrgOverviewTab({ organization, onChangePlan }: OrgOverviewTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Organization Details</CardTitle></CardHeader>
                <CardContent>
                    <InfoRow icon={Hash} label="Code" value={organization.code} />
                    <InfoRow icon={Globe} label="Slug" value={organization.slug} />
                    <InfoRow icon={Mail} label="Email" value={organization.email} />
                    <InfoRow icon={Phone} label="Phone" value={organization.phone} />
                    <InfoRow icon={MapPin} label="Address" value={organization.address} />
                    <InfoRow icon={Calendar} label="Created"
                        value={new Date(organization.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'long', year: 'numeric',
                        })} />
                    <InfoRow icon={Calendar} label="Last Updated"
                        value={new Date(organization.updated_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'long', year: 'numeric',
                        })} />
                    {organization.status === 'SUSPENDED' && (
                        <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Suspension Reason</p>
                                <p className="text-sm text-yellow-700 mt-0.5">
                                    {organization.suspension_reason
                                        ? SUSPENSION_REASON_LABELS[organization.suspension_reason]
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Subscription Plan</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                        <Badge variant={PlanColors[organization.plan_type]} size="lg">
                            {PlanLabels[organization.plan_type]}
                        </Badge>
                        <p className="text-xs text-gray-500 text-center">
                            Current plan tier for this organization
                        </p>
                        <Button variant="secondary" size="sm" onClick={onChangePlan} className="mt-2 w-full">
                            Change Plan
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ── UsersTable ────────────────────────────────────────────────────────────────

interface UsersTableProps {
    users: OrgUser[];
    loading: boolean;
}

export function UsersTable({ users, loading }: UsersTableProps) {
    if (loading) {
        return (
            <div className="py-8 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mx-auto" />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="py-10 text-center">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No users in this organization yet</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {['Name', 'Email', 'Role', 'Status', 'Joined'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-5 py-3">
                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-1.5">
                                    {user.role === 'ADMIN'
                                        ? <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                                        : <GraduationCap className="h-3.5 w-3.5 text-green-500" />
                                    }
                                    <span className="text-xs font-medium text-gray-700">{user.role_display}</span>
                                </div>
                            </td>
                            <td className="px-5 py-3">
                                <Badge variant={user.is_active ? 'success' : 'danger'}>
                                    {user.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-500">
                                {new Date(user.date_joined).toLocaleDateString('en-GB', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── OrgUsersTab ───────────────────────────────────────────────────────────────

interface OrgUsersTabProps {
    users: OrgUser[];
    loading: boolean;
    onAddExisting: () => void;
}

export function OrgUsersTab({ users, loading, onAddExisting }: OrgUsersTabProps) {
    return (
        <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                        <p className="text-sm text-gray-500 mt-0.5">All users in this organization</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="info">{users.length} user{users.length !== 1 ? 's' : ''}</Badge>
                        <Button size="sm" onClick={onAddExisting} className="gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Add Existing User
                        </Button>
                    </div>
                </div>
            </div>
            <UsersTable users={users} loading={loading} />
        </Card>
    );
}

// ── EditModal ─────────────────────────────────────────────────────────────────

interface OrgFormData {
    name: string;
    email: string;
    phone: string;
    address: string;
    plan_type: PlanType;
}

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: OrgFormData) => Promise<boolean>;
    org: Organization;
    submitting: boolean;
}

export function EditModal({ isOpen, onClose, onSubmit, org, submitting }: EditModalProps) {
    const [form, setForm] = useState<OrgFormData>({
        name: org.name,
        email: org.email,
        phone: org.phone,
        address: org.address,
        plan_type: org.plan_type,
    });
    const [errors, setErrors] = useState<Partial<OrgFormData>>({});

    const handleChange = (field: keyof OrgFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e: Partial<OrgFormData> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        const ok = await onSubmit(form);
        if (ok) onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Organization" size="lg">
            <div className="space-y-4">
                <Input label="Organization Name *" value={form.name}
                    onChange={e => handleChange('name', e.target.value)} error={errors.name} />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Email" type="email" value={form.email}
                        onChange={e => handleChange('email', e.target.value)} error={errors.email} />
                    <Input label="Phone" value={form.phone}
                        onChange={e => handleChange('phone', e.target.value)} />
                </div>
                <Input label="Address" value={form.address}
                    onChange={e => handleChange('address', e.target.value)} />
                <Select label="Plan Type" value={form.plan_type}
                    onChange={e => handleChange('plan_type', e.target.value)}
                    options={[
                        { value: 'FREE', label: 'Free' },
                        { value: 'BASIC', label: 'Basic' },
                        { value: 'PREMIUM', label: 'Premium' },
                        { value: 'ENTERPRISE', label: 'Enterprise' },
                    ]}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── DeleteModal ───────────────────────────────────────────────────────────────

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    orgName: string;
    submitting: boolean;
}

export function DeleteModal({ isOpen, onClose, onConfirm, orgName, submitting }: DeleteModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Organization" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <div>
                        <p className="text-sm font-medium text-red-800">This cannot be undone</p>
                        <p className="text-sm text-red-700 mt-1">
                            Permanently delete <strong>{orgName}</strong> and all its data?
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── AddToOrgModal ─────────────────────────────────────────────────────────────

interface AddToOrgModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (userId: number, organizationId: number, role: string) => Promise<void>;
    allUsers: GlobalUser[];
    lockedOrgId: number;
    lockedOrgName: string;
    submitting: boolean;
}

export function AddToOrgModal({
    isOpen, onClose, onSubmit, allUsers,
    lockedOrgId, lockedOrgName, submitting,
}: AddToOrgModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [role, setRole] = useState('INSTRUCTOR');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSelectedUserId('');
        setRole('INSTRUCTOR');
        setError(null);
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!selectedUserId) { setError('Please select a user.'); return; }
        setError(null);
        try {
            await onSubmit(Number(selectedUserId), lockedOrgId, role);
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to add user.');
        }
    };

    const options = allUsers
        .filter(u => !u.is_superadmin)
        .map(u => ({ value: String(u.id), label: `${u.full_name} (${u.email})` }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add User to ${lockedOrgName}`} size="sm">
            <div className="space-y-4">
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Organization</p>
                    <p className="text-sm font-medium text-gray-900">{lockedOrgName}</p>
                </div>

                <Select
                    label="User *"
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    options={[
                        { value: '', label: 'Select user...' },
                        ...options,
                    ]}
                />

                <Select
                    label="Role *"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    options={[
                        { value: 'INSTRUCTOR', label: 'Instructor' },
                        { value: 'ADMIN', label: 'Admin' },
                    ]}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                        {submitting ? 'Adding...' : 'Add to Organization'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── SuspendModal ──────────────────────────────────────────────────────────────

interface SuspendModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: SuspensionReason) => Promise<void>;
    organization: Organization | null;
    submitting: boolean;
}

export function SuspendModal({ isOpen, onClose, onConfirm, organization, submitting }: SuspendModalProps) {
    const [reason, setReason] = useState<SuspensionReason>('ADMIN_ACTION');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Suspend Organization" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-yellow-800">
                            Suspend <strong>{organization?.name}</strong>?
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                            Members lose access immediately. Memberships are preserved
                            and access resumes on unsuspend.
                        </p>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Suspension Reason</p>
                    <select
                        value={reason}
                        onChange={e => setReason(e.target.value as SuspensionReason)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                        {(Object.keys(SUSPENSION_REASON_LABELS) as SuspensionReason[]).map(r => (
                            <option key={r} value={r}>{SUSPENSION_REASON_LABELS[r]}</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button
                        onClick={() => onConfirm(reason)}
                        disabled={submitting}
                        className="bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white"
                    >
                        {submitting ? 'Suspending...' : 'Suspend Organization'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}