'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, AlertTriangle } from 'lucide-react';
import { useOrganizations } from '@/app/core/hooks/useOrganizations';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { useSubmitHandler } from '@/app/core/hooks/useSubmitHandler';
import { useModalState, useFlagModal } from '@/app/core/hooks/useModalState';
import { useListFilters } from '@/app/core/hooks/useListFilters';
import {
    StatsBar, OrgFormModal, DeleteModal, SuspendModal,
    OrgTableRow, OrgFilters,
} from '@/app/core/components/superadmin/OrgListComponents';
import type { Organization, PlanType, SuspensionReason, OrgFormData } from '@/app/core/types/organization';

export default function OrganizationsPage() {
    const router = useRouter();
    const {
        organizations, loading, error, refetch,
        createOrganization, updateOrganization,
        deleteOrganization, suspendOrganization, unsuspendOrganization,
    } = useOrganizations();

    const { filters, setFilter } = useListFilters({
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
                    className="bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 gap-2">
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

            <OrgFilters
                search={filters.search}
                statusFilter={filters.status}
                planFilter={filters.plan}
                onSearch={v => setFilter('search', v)}
                onStatusChange={v => setFilter('status', v)}
                onPlanChange={v => setFilter('plan', v)}
            />

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                {['Organization', 'Contact', 'Plan', 'Type', 'Users', 'Status', 'Created', 'Actions'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-500">
                                            {filters.search || filters.status !== 'all' || filters.plan !== 'all'
                                                ? 'No organizations match your filters'
                                                : 'No organizations yet'
                                            }
                                        </p>
                                        {!filters.search && filters.status === 'all' && filters.plan === 'all' && (
                                            <button onClick={createModal.open}
                                                className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
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
                                        onView={o => router.push(`/superadmin/organizations/${o.id}`)}
                                        onEdit={o => { setActionError(null); editModal.open(o); }}
                                        onSuspend={o => { setActionError(null); suspendModal.open(o); }}
                                        onUnsuspend={handleUnsuspend}
                                        onDelete={o => { setActionError(null); deleteModal.open(o); }}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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