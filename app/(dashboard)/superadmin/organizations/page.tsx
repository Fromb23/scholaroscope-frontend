'use client';

// ============================================================================
// app/(dashboard)/superadmin/organizations/page.tsx
// Route: /superadmin/organizations
// Actions: list, search, filter by status, create, suspend/activate, delete
// ============================================================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Building2, Plus, Search, Eye, Pencil, Trash2,
    PowerOff, Power, Users, MoreVertical, AlertTriangle,
} from 'lucide-react';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { Organization, PLAN_LABELS, PLAN_COLORS } from '@/app/core/types/organization';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import Modal from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';

// ============================================================================
// Sub-components
// ============================================================================

function StatsBar({ organizations }: { organizations: Organization[] }) {
    const total = organizations.length;
    const active = organizations.filter(o => o.is_active).length;
    const suspended = total - active;

    const stats = [
        { label: 'Total Organizations', value: total, color: 'text-gray-900' },
        { label: 'Active', value: active, color: 'text-green-600' },
        { label: 'Suspended', value: suspended, color: 'text-red-600' },
    ];

    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            {stats.map(s => (
                <Card key={s.label} className="py-4 px-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </Card>
            ))}
        </div>
    );
}

// ============================================================================
// Create / Edit Modal Form
// ============================================================================

interface OrgFormData {
    name: string;
    email: string;
    phone: string;
    address: string;
    plan_type: string;
}

const EMPTY_FORM: OrgFormData = {
    name: '',
    email: '',
    phone: '',
    address: '',
    plan_type: 'FREE',
};

function OrgFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    submitting,
    mode,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: OrgFormData) => Promise<void>;
    initialData?: OrgFormData;
    submitting: boolean;
    mode: 'create' | 'edit';
}) {
    const [form, setForm] = useState<OrgFormData>(initialData ?? EMPTY_FORM);
    const [errors, setErrors] = useState<Partial<OrgFormData>>({});

    // Reset form when modal opens with new data
    useState(() => {
        setForm(initialData ?? EMPTY_FORM);
        setErrors({});
    });

    const handleChange = (field: keyof OrgFormData, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Partial<OrgFormData> = {};
        if (!form.name.trim()) newErrors.name = 'Organization name is required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = 'Enter a valid email address';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        await onSubmit(form);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'create' ? 'Create Organization' : 'Edit Organization'}
            size="lg"
        >
            <div className="space-y-4">
                <Input
                    label="Organization Name *"
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    error={errors.name}
                    placeholder="e.g. Greenwood Academy"
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Email"
                        type="email"
                        value={form.email}
                        onChange={e => handleChange('email', e.target.value)}
                        error={errors.email}
                        placeholder="admin@school.com"
                    />
                    <Input
                        label="Phone"
                        value={form.phone}
                        onChange={e => handleChange('phone', e.target.value)}
                        placeholder="+254 700 000 000"
                    />
                </div>
                <Input
                    label="Address"
                    value={form.address}
                    onChange={e => handleChange('address', e.target.value)}
                    placeholder="123 School Road, Nairobi"
                />
                <Select
                    label="Plan Type"
                    value={form.plan_type}
                    onChange={e => handleChange('plan_type', e.target.value)}
                    options={[
                        { value: 'FREE', label: 'Free' },
                        { value: 'BASIC', label: 'Basic' },
                        { value: 'PREMIUM', label: 'Premium' },
                        { value: 'ENTERPRISE', label: 'Enterprise' },
                    ]}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
                    >
                        {submitting
                            ? mode === 'create' ? 'Creating...' : 'Saving...'
                            : mode === 'create' ? 'Create Organization' : 'Save Changes'
                        }
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Delete Confirmation Modal
// ============================================================================

function DeleteModal({
    isOpen,
    onClose,
    onConfirm,
    organization,
    submitting,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    organization: Organization | null;
    submitting: boolean;
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Organization" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">This action cannot be undone</p>
                        <p className="text-sm text-red-700 mt-1">
                            Deleting <strong>{organization?.name}</strong> will permanently remove the
                            organization and all its associated data.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete Organization'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ============================================================================
// Organization Table Row
// ============================================================================

function OrgTableRow({
    org,
    onView,
    onEdit,
    onToggleActive,
    onDelete,
}: {
    org: Organization;
    onView: (org: Organization) => void;
    onEdit: (org: Organization) => void;
    onToggleActive: (org: Organization) => void;
    onDelete: (org: Organization) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            {/* Name + code */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        {org.logo ? (
                            <img src={org.logo} alt={org.name} className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                            <Building2 className="h-4 w-4 text-purple-600" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{org.code}</p>
                    </div>
                </div>
            </td>

            {/* Contact */}
            <td className="px-6 py-4">
                <p className="text-sm text-gray-700">{org.email || '—'}</p>
                <p className="text-xs text-gray-500">{org.phone || '—'}</p>
            </td>

            {/* Plan */}
            <td className="px-6 py-4">
                <Badge variant={PLAN_COLORS[org.plan_type]}>
                    {PLAN_LABELS[org.plan_type]}
                </Badge>
            </td>

            {/* Users */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {org.user_count}
                </div>
            </td>

            {/* Status */}
            <td className="px-6 py-4">
                <Badge variant={org.is_active ? 'success' : 'danger'}>
                    {org.is_active ? 'Active' : 'Suspended'}
                </Badge>
            </td>

            {/* Created */}
            <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(org.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                })}
            </td>

            {/* Actions */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onView(org)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="View details"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onEdit(org)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit organization"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onToggleActive(org)}
                        className={`p-1.5 rounded-lg transition-colors ${org.is_active
                            ? 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'
                            : 'text-gray-500 hover:bg-green-50 hover:text-green-600'
                            }`}
                        title={org.is_active ? 'Suspend organization' : 'Activate organization'}
                    >
                        {org.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => onDelete(org)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete organization"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function OrganizationsPage() {
    const router = useRouter();
    const {
        organizations,
        loading,
        error,
        refetch,
        createOrganization,
        updateOrganization,
        deleteOrganization,
        toggleOrganizationActive,
    } = useOrganizations();

    // Search + filter state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');

    // Modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Organization | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Filtered list
    const filtered = useMemo(() => {
        return organizations.filter(org => {
            const matchSearch =
                !search ||
                org.name.toLowerCase().includes(search.toLowerCase()) ||
                org.code.toLowerCase().includes(search.toLowerCase()) ||
                org.email.toLowerCase().includes(search.toLowerCase());

            const matchStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && org.is_active) ||
                (statusFilter === 'suspended' && !org.is_active);

            const matchPlan = planFilter === 'all' || org.plan_type === planFilter;

            return matchSearch && matchStatus && matchPlan;
        });
    }, [organizations, search, statusFilter, planFilter]);

    // ---- Handlers ----

    const handleCreate = async (data: OrgFormData) => {
        setSubmitting(true);
        setActionError(null);
        try {
            await createOrganization({
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                plan_type: data.plan_type as any,
            });
            setCreateOpen(false);
        } catch (err: any) {
            setActionError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async (data: OrgFormData) => {
        if (!editTarget) return;
        setSubmitting(true);
        setActionError(null);
        try {
            await updateOrganization(editTarget.id, {
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                plan_type: data.plan_type as any,
            });
            setEditTarget(null);
        } catch (err: any) {
            setActionError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (org: Organization) => {
        setActionError(null);
        try {
            await toggleOrganizationActive(org.id, !org.is_active);
        } catch (err: any) {
            setActionError(err.message);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        setActionError(null);
        try {
            await deleteOrganization(deleteTarget.id);
            setDeleteTarget(null);
        } catch (err: any) {
            setActionError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ---- Render ----

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
                    <p className="mt-3 text-sm text-gray-500">Loading organizations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600">{error}</p>
                    <Button variant="secondary" onClick={refetch} className="mt-3">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage all institutions on the platform
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => { setActionError(null); setCreateOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Organization
                </Button>
            </div>

            {/* Stats Bar */}
            <StatsBar organizations={organizations} />

            {/* Action error banner */}
            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {actionError}
                    <button
                        onClick={() => setActionError(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >✕</button>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, code or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <select
                        value={planFilter}
                        onChange={e => setPlanFilter(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Plans</option>
                        <option value="FREE">Free</option>
                        <option value="BASIC">Basic</option>
                        <option value="PREMIUM">Premium</option>
                        <option value="ENTERPRISE">Enterprise</option>
                    </select>
                </div>
            </Card>

            {/* Table */}
            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Organization
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Plan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Users
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-500">
                                            {search || statusFilter !== 'all' || planFilter !== 'all'
                                                ? 'No organizations match your filters'
                                                : 'No organizations yet'}
                                        </p>
                                        {!search && statusFilter === 'all' && planFilter === 'all' && (
                                            <button
                                                onClick={() => setCreateOpen(true)}
                                                className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                                            >
                                                Create your first organization →
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(org => (
                                    <OrgTableRow
                                        key={org.id}
                                        org={org}
                                        onView={org => router.push(`/superadmin/organizations/${org.id}`)}
                                        onEdit={org => { setActionError(null); setEditTarget(org); }}
                                        onToggleActive={handleToggleActive}
                                        onDelete={org => { setActionError(null); setDeleteTarget(org); }}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">
                            Showing {filtered.length} of {organizations.length} organization
                            {organizations.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </Card>

            {/* Create Modal */}
            <OrgFormModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                submitting={submitting}
                mode="create"
            />

            {/* Edit Modal */}
            {editTarget && (
                <OrgFormModal
                    isOpen={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    onSubmit={handleEdit}
                    initialData={{
                        name: editTarget.name,
                        email: editTarget.email,
                        phone: editTarget.phone,
                        address: editTarget.address,
                        plan_type: editTarget.plan_type,
                    }}
                    submitting={submitting}
                    mode="edit"
                />
            )}

            {/* Delete Modal */}
            <DeleteModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                organization={deleteTarget}
                submitting={submitting}
            />
        </div>
    );
}