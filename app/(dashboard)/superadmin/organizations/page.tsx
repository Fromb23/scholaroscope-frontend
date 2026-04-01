'use client';

import { useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Building2, AlertTriangle,
    Eye, Pencil, Power, PowerOff, Trash2, Users,
} from 'lucide-react';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { DataTable, Column } from '@/app/components/ui/Table';
import { useSubmitHandler } from '@/app/core/hooks/useSubmitHandler';
import { useModalState, useFlagModal } from '@/app/core/hooks/useModalState';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';
import {
    StatsBar, OrgFormModal, DeleteModal, SuspendModal,
} from '@/app/core/components/superadmin/OrgListComponents';
import type { Organization, PlanType, SuspensionReason, OrgFormData } from '@/app/core/types/organization';
import {
    PLAN_LABELS, PLAN_COLORS,
    ORG_STATUS_COLORS, ORG_STATUS_LABELS,
    SUSPENSION_REASON_LABELS,
} from '@/app/core/types/organization';

type OrgRow = Organization & Record<string, unknown>;

function OrganizationsPageInner() {
    const router = useRouter();
    const {
        organizations, loading, error, refetch,
        createOrganization, updateOrganization,
        deleteOrganization, suspendOrganization, unsuspendOrganization,
    } = useOrganizations();

    const [filters, updateFilters] = usePersistedFilters<{
        search: string;
        status: string;
        plan: string;
    }>('/superadmin/organizations', {
        search: '',
        status: 'all',
        plan: 'all',
    });

    const createModal = useFlagModal();
    const editModal = useModalState<Organization>();
    const deleteModal = useModalState<Organization>();
    const suspendModal = useModalState<Organization>();

    const { submitting, actionError, setActionError, withSubmit } = useSubmitHandler();

    const filtered = useMemo(() => organizations.filter(org => {
        const q = filters.search.toLowerCase();
        const matchSearch = !filters.search ||
            org.name.toLowerCase().includes(q) ||
            org.code.toLowerCase().includes(q) ||
            org.email.toLowerCase().includes(q);
        const matchStatus = filters.status === 'all' || org.status === filters.status;
        const matchPlan = filters.plan === 'all' || org.plan_type === filters.plan;
        return matchSearch && matchStatus && matchPlan;
    }), [organizations, filters]);

    const handleCreate = (data: OrgFormData) =>
        withSubmit(async () => {
            await createOrganization({
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                plan_type: data.plan_type as PlanType,
                org_type: data.org_type,
            });
            createModal.close();
        });

    const handleEdit = (data: OrgFormData) =>
        withSubmit(async () => {
            await updateOrganization(editModal.target!.id, {
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                plan_type: data.plan_type as PlanType,
            });
            editModal.close();
        });

    const handleSuspend = (reason: SuspensionReason) =>
        withSubmit(async () => {
            await suspendOrganization(suspendModal.target!.id, reason);
            suspendModal.close();
        });

    const handleUnsuspend = (org: Organization) =>
        withSubmit(async () => {
            await unsuspendOrganization(org.id);
        });

    const handleDelete = () =>
        withSubmit(async () => {
            await deleteOrganization(deleteModal.target!.id);
            deleteModal.close();
        });

    const columns: Column<OrgRow>[] = [
        {
            key: 'name',
            header: 'Organization',
            render: org => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        {org.logo
                            ? <img src={org.logo as string} alt={org.name} className="h-9 w-9 rounded-lg object-cover" />
                            : <Building2 className="h-4 w-4 text-purple-600" />
                        }
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{org.code}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'email',
            header: 'Contact',
            render: org => (
                <div>
                    <p className="text-sm text-gray-700">{org.email || '—'}</p>
                    <p className="text-xs text-gray-500">{org.phone || '—'}</p>
                </div>
            ),
        },
        {
            key: 'plan_type',
            header: 'Plan',
            render: org => (
                <Badge variant={PLAN_COLORS[org.plan_type]}>
                    {PLAN_LABELS[org.plan_type]}
                </Badge>
            ),
        },
        {
            key: 'org_type',
            header: 'Type',
            render: org => (
                <Badge variant={org.org_type === 'INSTITUTION' ? 'blue' : 'purple'}>
                    {org.org_type === 'INSTITUTION' ? 'Institution' : 'Personal'}
                </Badge>
            ),
        },
        {
            key: 'member_count',
            header: 'Users',
            render: org => (
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {org.member_count}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: org => (
                <div className="space-y-1">
                    <Badge variant={ORG_STATUS_COLORS[org.status]}>
                        {ORG_STATUS_LABELS[org.status]}
                    </Badge>
                    {org.status === 'SUSPENDED' && org.suspension_reason && (
                        <p className="text-xs text-gray-400">
                            {SUSPENSION_REASON_LABELS[org.suspension_reason as SuspensionReason]}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            render: org => (
                <span className="text-sm text-gray-500">
                    {new Date(org.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                    })}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: org => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => router.push(`/superadmin/organizations/${org.id}`)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="View details"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => { setActionError(null); editModal.open(org); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => org.status === 'SUSPENDED'
                            ? handleUnsuspend(org)
                            : (() => { setActionError(null); suspendModal.open(org); })()
                        }
                        className={`p-1.5 rounded-lg transition-colors ${org.status === 'SUSPENDED'
                            ? 'text-gray-500 hover:bg-green-50 hover:text-green-600'
                            : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'
                            }`}
                        title={org.status === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                    >
                        {org.status === 'SUSPENDED'
                            ? <Power className="h-4 w-4" />
                            : <PowerOff className="h-4 w-4" />
                        }
                    </button>
                    <button
                        onClick={() => { setActionError(null); deleteModal.open(org); }}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage all institutions on the platform</p>
                </div>
                <Button
                    onClick={() => { setActionError(null); createModal.open(); }}
                    className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2"
                >
                    <Plus className="h-4 w-4" /> New Organization
                </Button>
            </div>

            <StatsBar organizations={organizations} />

            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Search by name, code or email..."
                        value={filters.search}
                        onChange={e => updateFilters({ search: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                        value={filters.status}
                        onChange={e => updateFilters({ status: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                    <select
                        value={filters.plan}
                        onChange={e => updateFilters({ plan: e.target.value })}
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

            <Card className="p-0 overflow-hidden">
                <DataTable
                    data={filtered as OrgRow[]}
                    columns={columns}
                    enableSearch={false}
                    emptyMessage={
                        filters.search || filters.status !== 'all' || filters.plan !== 'all'
                            ? 'No organizations match your filters'
                            : 'No organizations yet'
                    }
                />
                {filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">
                            Showing {filtered.length} of {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </Card>

            <OrgFormModal
                isOpen={createModal.isOpen}
                onClose={createModal.close}
                onSubmit={handleCreate}
                submitting={submitting}
                mode="create"
            />

            {editModal.target && (
                <OrgFormModal
                    isOpen={editModal.isOpen}
                    onClose={editModal.close}
                    onSubmit={handleEdit}
                    initialData={{
                        name: editModal.target.name,
                        email: editModal.target.email,
                        phone: editModal.target.phone,
                        address: editModal.target.address,
                        plan_type: editModal.target.plan_type,
                        org_type: editModal.target.org_type,
                    }}
                    submitting={submitting}
                    mode="edit"
                />
            )}

            <SuspendModal
                isOpen={suspendModal.isOpen}
                onClose={suspendModal.close}
                onConfirm={handleSuspend}
                organization={suspendModal.target}
                submitting={submitting}
            />

            <DeleteModal
                isOpen={deleteModal.isOpen}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                organization={deleteModal.target}
                submitting={submitting}
            />
        </div>
    );
}

export default function OrganizationsPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <OrganizationsPageInner />
        </Suspense>
    );
}