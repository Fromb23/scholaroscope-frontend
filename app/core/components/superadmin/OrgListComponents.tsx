'use client';

import { useState } from 'react';
import {
    Building2, Eye, Pencil, Trash2, PowerOff,
    Power, Users, AlertTriangle, Search,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import Modal from '@/app/components/ui/Modal';
import type {
    Organization, OrgFormData, SuspensionReason,
} from '@/app/core/types/organization';
import {
    PLAN_LABELS, PLAN_COLORS,
    ORG_STATUS_COLORS, ORG_STATUS_LABELS,
    SUSPENSION_REASON_LABELS,
} from '@/app/core/types/organization';

// ── StatsBar ──────────────────────────────────────────────────────────────

interface StatsBarProps { organizations: Organization[] }

export function StatsBar({ organizations }: StatsBarProps) {
    const total = organizations.length;
    const active = organizations.filter(o => o.status === 'ACTIVE').length;
    const suspended = total - active;

    return (
        <div className="grid grid-cols-3 gap-4">
            {[
                { label: 'Total Organizations', value: total, color: 'text-gray-900' },
                { label: 'Active', value: active, color: 'text-green-600' },
                { label: 'Suspended', value: suspended, color: 'text-red-600' },
            ].map(s => (
                <Card key={s.label} className="py-4 px-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </Card>
            ))}
        </div>
    );
}

// ── OrgFormData ───────────────────────────────────────────────────────────



export const EMPTY_FORM: OrgFormData = {
    name: '', email: '', phone: '', address: '',
    plan_type: 'FREE', org_type: 'INSTITUTION',
};

// ── OrgFormModal ──────────────────────────────────────────────────────────

interface OrgFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: OrgFormData) => Promise<void>;
    initialData?: Partial<OrgFormData>;
    submitting: boolean;
    mode: 'create' | 'edit';
}

export function OrgFormModal({
    isOpen, onClose, onSubmit, initialData, submitting, mode,
}: OrgFormModalProps) {
    const [form, setForm] = useState<OrgFormData>({ ...EMPTY_FORM, ...initialData });
    const [errors, setErrors] = useState<Partial<OrgFormData>>({});

    const set = (field: keyof OrgFormData, val: string) => {
        setForm(p => ({ ...p, [field]: val }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
    };

    const validate = (): boolean => {
        const e: Partial<OrgFormData> = {};
        if (!form.name.trim()) e.name = 'Organization name is required';
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
        setErrors(e);
        return Object.keys(e).length === 0;
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
                <Input label="Organization Name *" value={form.name}
                    onChange={e => set('name', e.target.value)}
                    error={errors.name} placeholder="e.g. Greenwood Academy" />

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Email" type="email" value={form.email}
                        onChange={e => set('email', e.target.value)}
                        error={errors.email} placeholder="admin@school.com" />
                    <Input label="Phone" value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        placeholder="+254 700 000 000" />
                </div>

                <Input label="Address" value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="123 School Road, Nairobi" />

                <div className="grid grid-cols-2 gap-4">
                    <Select label="Plan Type" value={form.plan_type}
                        onChange={e => set('plan_type', e.target.value)}
                        options={[
                            { value: 'FREE', label: 'Free' },
                            { value: 'BASIC', label: 'Basic' },
                            { value: 'PREMIUM', label: 'Premium' },
                            { value: 'ENTERPRISE', label: 'Enterprise' },
                        ]} />

                    {mode === 'create' ? (
                        <Select label="Organization Type" value={form.org_type}
                            onChange={e => set('org_type', e.target.value)}
                            options={[
                                { value: 'INSTITUTION', label: 'Institution (School / Business)' },
                                { value: 'PERSONAL', label: 'Personal Workspace' },
                            ]} />
                    ) : (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Organization Type</p>
                            <div className="px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
                                {form.org_type === 'INSTITUTION' ? 'Institution' : 'Personal Workspace'}
                                <span className="ml-2 text-xs text-gray-400">(cannot be changed)</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting}
                        className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
                        {submitting
                            ? mode === 'create' ? 'Creating...' : 'Saving...'
                            : mode === 'create' ? 'Create Organization' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── DeleteModal ───────────────────────────────────────────────────────────

interface DeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    organization: Organization | null;
    submitting: boolean;
}

export function DeleteModal({ isOpen, onClose, onConfirm, organization, submitting }: DeleteModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Organization" size="sm">
            <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800">This action cannot be undone</p>
                        <p className="text-sm text-red-700 mt-1">
                            Deleting <strong>{organization?.name}</strong> will permanently remove
                            the organization and all its associated data.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button variant="danger" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Deleting...' : 'Delete Organization'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── SuspendModal ──────────────────────────────────────────────────────────

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
                            Members will lose access immediately. Memberships are preserved
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

// ── OrgTableRow ───────────────────────────────────────────────────────────

interface OrgTableRowProps {
    org: Organization;
    onView: (org: Organization) => void;
    onEdit: (org: Organization) => void;
    onSuspend: (org: Organization) => void;
    onUnsuspend: (org: Organization) => void;
    onDelete: (org: Organization) => void;
}

export function OrgTableRow({ org, onView, onEdit, onSuspend, onUnsuspend, onDelete }: OrgTableRowProps) {
    const isSuspended = org.status === 'SUSPENDED';

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        {org.logo
                            ? <img src={org.logo} alt={org.name} className="h-9 w-9 rounded-lg object-cover" />
                            : <Building2 className="h-4 w-4 text-purple-600" />
                        }
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{org.code}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <p className="text-sm text-gray-700">{org.email || '—'}</p>
                <p className="text-xs text-gray-500">{org.phone || '—'}</p>
            </td>
            <td className="px-6 py-4">
                <Badge variant={PLAN_COLORS[org.plan_type]}>{PLAN_LABELS[org.plan_type]}</Badge>
            </td>
            <td className="px-6 py-4">
                <Badge variant={org.org_type === 'INSTITUTION' ? 'blue' : 'purple'}>
                    {org.org_type === 'INSTITUTION' ? 'Institution' : 'Personal'}
                </Badge>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {org.member_count}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="space-y-1">
                    <Badge variant={ORG_STATUS_COLORS[org.status]}>
                        {ORG_STATUS_LABELS[org.status]}
                    </Badge>
                    {isSuspended && org.suspension_reason && (
                        <p className="text-xs text-gray-400">
                            {SUSPENSION_REASON_LABELS[org.suspension_reason]}
                        </p>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-gray-500">
                {new Date(org.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric',
                })}
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1">
                    <button onClick={() => onView(org)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="View details">
                        <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => onEdit(org)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => isSuspended ? onUnsuspend(org) : onSuspend(org)}
                        className={`p-1.5 rounded-lg transition-colors ${isSuspended
                            ? 'text-gray-500 hover:bg-green-50 hover:text-green-600'
                            : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'
                            }`}
                        title={isSuspended ? 'Unsuspend' : 'Suspend'}>
                        {isSuspended ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => onDelete(org)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ── OrgFilters ────────────────────────────────────────────────────────────

interface OrgFiltersProps {
    search: string;
    statusFilter: string;
    planFilter: string;
    onSearch: (v: string) => void;
    onStatusChange: (v: string) => void;
    onPlanChange: (v: string) => void;
}

export function OrgFilters({
    search, statusFilter, planFilter,
    onSearch, onStatusChange, onPlanChange,
}: OrgFiltersProps) {
    return (
        <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, code or email..."
                        value={search}
                        onChange={e => onSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <select value={statusFilter} onChange={e => onStatusChange(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                </select>
                <select value={planFilter} onChange={e => onPlanChange(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="all">All Plans</option>
                    <option value="FREE">Free</option>
                    <option value="BASIC">Basic</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="ENTERPRISE">Enterprise</option>
                </select>
            </div>
        </Card>
    );
}